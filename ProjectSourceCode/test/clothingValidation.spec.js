// imports
const chai = require('chai');
const expect = chai.expect;

const {
    validateClothingItem,
    detectImageType,
    parsePrice,
    toList,
    MAX_IMAGE_BYTES
} = require('../src/validateClothingItem');

// first bytes of real PNG and JPEG files
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

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

    it('should reject a missing name', () => {
        const result = validateClothingItem({ name: '   ', category: 'tops' }, file(pngBytes));

        expect(result).to.equal('Please enter a name for the item.');
    });

    it('should reject an unknown category', () => {
        const result = validateClothingItem({ name: 'Hat', category: 'hats' }, file(pngBytes));

        expect(result).to.equal('Please choose a category.');
    });

    it('should reject a missing photo', () => {
        const result = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, undefined);

        expect(result).to.equal('Please choose a photo to upload.');
    });

    it('should reject a photo over 5 MB', () => {
        const result = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, { buffer: pngBytes, size: MAX_IMAGE_BYTES + 1 });

        expect(result).to.equal('Photo must be 5 MB or smaller.');
    });

    it('should reject a file that is not a PNG or JPEG, even if named like one', () => {
        const gif = Buffer.from('GIF89a', 'ascii');
        const result = validateClothingItem({ name: 'Blue T-shirt', category: 'tops' }, file(gif));

        expect(result).to.equal('Photo must be a PNG or JPEG file.');
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

    it('should reject a style that is not in the list', () => {
        const result = validateClothingItem({ name: 'Floral Shirt', category: 'tops', style: 'preppy' }, file(pngBytes));

        expect(result).to.equal('Please choose a style from the list.');
    });

    it('should turn form checkbox values into a list without duplicates', () => {
        expect(toList(undefined)).to.deep.equal([]);
        expect(toList('red')).to.deep.equal(['red']);
        expect(toList(['red', 'white', 'red'])).to.deep.equal(['red', 'white']);
    });

    it('should detect PNG and JPEG files from their contents', () => {
        expect(detectImageType(pngBytes)).to.equal('image/png');
        expect(detectImageType(jpegBytes)).to.equal('image/jpeg');
        expect(detectImageType(Buffer.from('hello'))).to.equal(null);
    });

});
