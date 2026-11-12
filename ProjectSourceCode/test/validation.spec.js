// imports
const chai = require('chai');
const expect = chai.expect;

const validateRegistration = require('../src/validateRegistration');


describe('Registration Validation', () => {

    it('should reject passwords shorter than 8 characters', () => {
        const result = validateRegistration('testuser', 'abc', 'abc');

        expect(result).to.equal('Password must be at least 8 characters long');
    });

    it('should reject mismatched passwords', () => {
    const result = validateRegistration('testuser', 'password123', 'different123');

    expect(result).to.equal('Passwords do not match');
    });

    it('should accept valid registration information', () => {
        const result = validateRegistration('testuser', 'password123', 'password123');

        expect(result).to.equal(null);
    });

});