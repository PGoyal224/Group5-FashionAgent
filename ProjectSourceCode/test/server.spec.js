const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');

describe('HTTP Integration Tests', () => {

    // remove test user before and after the tests
    before(async () => {
        await db.none(
            'DELETE FROM users WHERE username = $1',
            ['lab10_test_user']
        );
    });

    after(async () => {
        await db.none(
            'DELETE FROM users WHERE username = $1',
            ['lab10_test_user']
        );
    });

    it('should load the homepage', async () => {
        // sends simulated HTTP request to the express application
        const res = await chai.request(app).get('/');

        expect(res).to.have.status(200);
    });

    it('should register a new user', async () => {
        const res = await chai.request(app)
            .post('/register')
            .type('form')
            .send({
                username: 'lab10_test_user',
                password: 'password123',
                confirmPassword: 'password123'
            });

        expect(res).to.have.status(200);
        expect(res.text).to.include('Account created successfully!');

        const user = await db.oneOrNone(
            'SELECT * FROM users WHERE username = $1',
            ['lab10_test_user']
        );

        expect(user).to.not.equal(null);
    });

    it('should reject mismatched passwords', async () => {
        const res = await chai.request(app)
            .post('/register')
            .type('form')
            .send({
                username: 'invalid_test_user',
                password: 'password123',
                confirmPassword: 'different123'
            });

        expect(res).to.have.status(200);
        expect(res.text).to.include('Passwords do not match');

        const user = await db.oneOrNone(
            'SELECT * FROM users WHERE username = $1',
            ['invalid_test_user']
        );

        expect(user).to.equal(null);
    });

});