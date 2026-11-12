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

        it('should redirect to the dashboard when already logged in', async () => {
            const agent = chai.request.agent(app);
            await agent.post('/login').type('form').send({ username, password });

            const res = await agent.get('/login').redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo('/dashboard');
            agent.close();
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

    describe('GET /dashboard', () => {
        it('should redirect to login when signed out', async () => {
            const res = await chai.request(app).get('/dashboard').redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo('/login');
        });

        it('should greet the logged-in user by name', async () => {
            // agent keeps the session cookie between requests
            const agent = chai.request.agent(app);
            await agent.post('/login').type('form').send({ username, password });

            const res = await agent.get('/dashboard');

            expect(res).to.have.status(200);
            expect(res.text).to.include(`Welcome to Naxos, ${username}!`);
            agent.close();
        });
    });

    describe('POST /logout', () => {
        it('should show the logged-out page and end the session', async () => {
            const agent = chai.request.agent(app);
            await agent.post('/login').type('form').send({ username, password });

            // sanity check: the session works before logging out
            const before = await agent.get('/dashboard');
            expect(before).to.have.status(200);

            const res = await agent.post('/logout');
            expect(res).to.have.status(200);
            expect(res.text).to.include('You have successfully logged out');

            // the logged-out page must show the signed-out header, not Logout
            expect(res.text).to.include('href="/login"');
            expect(res.text).to.not.include('id="logoutModal"');

            // the same cookie no longer grants access to protected pages
            const after = await agent.get('/dashboard').redirects(0);
            expect(after).to.have.status(302);
            expect(after).to.redirectTo('/login');
            agent.close();
        });
    });

    describe('GET /register?reason=nouser', () => {
        it('should explain that no account was found', async () => {
            const res = await chai.request(app).get('/register?reason=nouser');

            expect(res).to.have.status(200);
            expect(res.text).to.include('No account found with that username. Please create one.');
        });
    });
});
