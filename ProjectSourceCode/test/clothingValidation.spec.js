// imports
const chai = require('chai');
const expect = chai.expect;

const {
    validateClothingItem,
    detectImageType,
    hasPhoto,
    parsePrice,
    toList,
    MAX_IMAGE_BYTES
} = require('../src/validateClothingItem');

// first bytes of real PNG and JPEG files
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const webpBytes = Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ', 'latin1');
const heicBytes = Buffer.from('\x00\x00\x00\x18ftypheic\x00\x00\x00\x00', 'latin1');

// shaped like the file object multer puts on req.file
const file = buffer => ({ buffer, size: buffer.length });


describe('Clothing Item Validation', () => {

    it('should accept a valid item with a PNG photo', () => {
        const result = validateClothingItem({ name: 'Blue T-shirt', category: 'tops', colors: 'blue', style: 'casual' }, file(pngBytes));

        expect(result).to.equal(null);
    });

    it('should accept a valid item with a JPEG photo and no optional fields', () => {
        const result = validateClothingItem({ name: 'Black Jeans', category: 'bottoms', style: '', brand: '', price_paid: '' }, file(jpegBytes));

        expect(result).to.equal(null);
    });

    it('should not need a name, since names are generated', () => {
        const result = validateClothingItem({ category: 'tops' }, file(pngBytes));

        expect(result).to.equal(null);
    });

    it('should reject details over 200 characters', () => {
        const result = validateClothingItem({ category: 'tops', details: 'x'.repeat(201) }, file(pngBytes));

        expect(result).to.equal('Details must be 200 characters or fewer.');
    });

    it('should reject an unknown category', () => {
        const result = validateClothingItem({ name: 'Hat', category: 'hats' }, file(pngBytes));

        expect(result).to.equal('Please choose a category.');
    });

    it('should accept an item without a photo', () => {
        const noFile = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, undefined);
        // what browsers send when the photo input is left blank
        const emptyFile = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, file(Buffer.alloc(0)));

        expect(noFile).to.equal(null);
        expect(emptyFile).to.equal(null);
    });

    it('should accept WebP and HEIC photos', () => {
        expect(validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, file(webpBytes))).to.equal(null);
        expect(validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, file(heicBytes))).to.equal(null);
    });

    it('should reject a photo over 5 MB', () => {
        const result = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, { buffer: pngBytes, size: MAX_IMAGE_BYTES + 1 });

        expect(result).to.equal('Photo must be 5 MB or smaller.');
    });

    it('should reject a file that is not a PNG or JPEG, even if named like one', () => {
        const gif = Buffer.from('GIF89a', 'ascii');
        const result = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, file(gif));

        expect(result).to.equal('Photo must be a PNG, JPEG, WebP, or HEIC file.');
    });

    it('should accept an optional brand and price paid', () => {
        const result = validateClothingItem({ name: 'Denim Jacket', category: 'tops', brand: "Levi's", price_paid: '$79.99' }, file(pngBytes));

        expect(result).to.equal(null);
    });

    it('should reject a price that is not a number', () => {
        const result = validateClothingItem({ name: 'Denim Jacket', category: 'tops', price_paid: 'cheap' }, file(pngBytes));

        expect(result).to.equal('Price paid must be a number like 25 or 19.99.');
    });

    it('should reject a negative price or more than 2 decimal places', () => {
        const negative = validateClothingItem({ name: 'Denim Jacket', category: 'tops', price_paid: '-5' }, file(pngBytes));
        const tooPrecise = validateClothingItem({ name: 'Denim Jacket', category: 'tops', price_paid: '19.999' }, file(pngBytes));

        expect(negative).to.equal('Price paid must be a number like 25 or 19.99.');
        expect(tooPrecise).to.equal('Price paid must be a number like 25 or 19.99.');
    });

    it('should reject a brand over 100 characters', () => {
        const result = validateClothingItem({ name: 'Denim Jacket', category: 'tops', brand: 'x'.repeat(101) }, file(pngBytes));

        expect(result).to.equal('Brand must be 100 characters or fewer.');
    });

    it('should turn typed prices into exact decimal text', () => {
        expect(parsePrice('$19.99')).to.equal('19.99');
        expect(parsePrice(' 25 ')).to.equal('25');
        expect(parsePrice('')).to.equal(null);
        expect(parsePrice('1000000')).to.equal(undefined);
    });

    it('should accept outerwear as a category', () => {
        const result = validateClothingItem({ name: 'Rain Jacket', category: 'outerwear' }, file(pngBytes));

        expect(result).to.equal(null);
    });

    it('should accept several colors for one item', () => {
        const result = validateClothingItem({ name: 'Floral Shirt', category: 'tops', colors: ['white', 'red'] }, file(pngBytes));

        expect(result).to.equal(null);
    });

    it('should reject a color that is not in the list', () => {
        const result = validateClothingItem({ name: 'Floral Shirt', category: 'tops', colors: ['white', 'chartreuse'] }, file(pngBytes));

        expect(result).to.equal('Please choose colors from the list.');
    });

    it('should accept a type that belongs to the category', () => {
        const result = validateClothingItem({ category: 'shoes', item_type: 'socks' }, file(pngBytes));

        expect(result).to.equal(null);
    });

    it('should reject a type from a different category', () => {
        const result = validateClothingItem({ category: 'tops', item_type: 'socks' }, file(pngBytes));

        expect(result).to.equal('Please choose a type that matches the category.');
    });

    it('should reject a type that is not in any list', () => {
        const result = validateClothingItem({ category: 'tops', item_type: 'cape' }, file(pngBytes));

        expect(result).to.equal('Please choose a type that matches the category.');
    });

    it('should reject a style that is not in the list', () => {
        const result = validateClothingItem({ name: 'Floral Shirt', category: 'tops', style: 'preppy' }, file(pngBytes));

        expect(result).to.equal('Please choose a style from the list.');
    });

    it('should turn form checkbox values into a list without duplicates', () => {
        expect(toList(undefined)).to.deep.equal([]);
        expect(toList('red')).to.deep.equal(['red']);
        expect(toList(['red', 'white', 'red'])).to.deep.equal(['red', 'white']);
    });

    it('should detect PNG, JPEG, WebP, and HEIC files from their contents', () => {
        expect(detectImageType(pngBytes)).to.equal('image/png');
        expect(detectImageType(jpegBytes)).to.equal('image/jpeg');
        expect(detectImageType(webpBytes)).to.equal('image/webp');
        expect(detectImageType(heicBytes)).to.equal('image/heic');
        expect(detectImageType(Buffer.from('hello'))).to.equal(null);
    });

    it('should treat a missing or empty file as no photo', () => {
        expect(hasPhoto(undefined)).to.equal(false);
        expect(hasPhoto(file(Buffer.alloc(0)))).to.equal(false);
        expect(hasPhoto(file(pngBytes))).to.equal(true);
    });

});
