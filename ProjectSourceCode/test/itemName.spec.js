// imports
const chai = require('chai');
const expect = chai.expect;

const { generateItemName } = require('../src/clothingOptions');


describe('Generated Item Names', () => {

    it('should use just the category when there are no colors', () => {
        expect(generateItemName('tops', [])).to.equal('Top');
        expect(generateItemName('accessories', [])).to.equal('Accessory');
    });

    it('should put one color before the category', () => {
        expect(generateItemName('shoes', ['navy'])).to.equal('Navy Shoes');
        expect(generateItemName('dresses', ['red'])).to.equal('Red Dress');
    });

    it('should join two colors with "&" in a fixed order', () => {
        expect(generateItemName('tops', ['white', 'black'])).to.equal('Black & White Top');
        expect(generateItemName('tops', ['black', 'white'])).to.equal('Black & White Top');
    });

    it('should call three or more colors "Multicolor"', () => {
        expect(generateItemName('outerwear', ['red', 'blue', 'yellow'])).to.equal('Multicolor Outerwear');
    });

    it('should use the type instead of the category when there is one', () => {
        expect(generateItemName('shoes', ['navy'], 'socks')).to.equal('Navy Socks');
        expect(generateItemName('tops', ['gray'], 'blouse')).to.equal('Gray Blouse');
        expect(generateItemName('tops', [], 'hoodie')).to.equal('Hoodie');
    });

    it('should capitalize each word of the type', () => {
        expect(generateItemName('tops', ['white'], 'tank top')).to.equal('White Tank Top');
        expect(generateItemName('tops', ['black'], 't-shirt')).to.equal('Black T-shirt');
    });

});
