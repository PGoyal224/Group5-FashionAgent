const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');

describe('Login, Sessions, and Logout', () => {
    const username = 'auth_test_user';
    const password = 'password123';

    // remove the test user before and after so the tests can run repeatedly
    const cleanup = () => db.none('DELETE FROM users WHERE username = $1', [username]);

    before(async () => {
        await cleanup();
        const hash = await bcrypt.hash(password, 10);
        await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);
    });

    after(async () => {
        await cleanup();
    });

    describe('GET /login', () => {
        it('should render the login form when signed out', async () => {
            const res = await chai.request(app).get('/login');

            expect(res).to.have.status(200);
            expect(res.text).to.include('action="/login"');
            expect(res.text).to.include('name="username"');
            expect(res.text).to.include('name="password"');
        });
    });

    describe('POST /login', () => {
        it('should reject empty fields with a message', async () => {
            const res = await chai.request(app)
                .post('/login')
                .type('form')
                .send({ username: '', password: '' });

            expect(res).to.have.status(200);
            expect(res.text).to.include('Please fill out all fields.');
        });

        it('should redirect unknown usernames to registration', async () => {
            const res = await chai.request(app)
                .post('/login')
                .type('form')
                .send({ username: 'auth_test_nobody', password })
                .redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo('/register?reason=nouser');
        });

        it('should show an incorrect password message on a wrong password', async () => {
            const res = await chai.request(app)
                .post('/login')
                .type('form')
                .send({ username, password: 'wrongpassword' });

            expect(res).to.have.status(200);
            expect(res.text).to.include('Incorrect password. Please try again.');
        });

        it('should redirect to the dashboard on a correct password', async () => {
            const res = await chai.request(app)
                .post('/login')
                .type('form')
                .send({ username, password })
                .redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo('/dashboard');
            expect(res).to.have.cookie('connect.sid');
        });
    });
});
