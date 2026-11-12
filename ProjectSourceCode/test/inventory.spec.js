const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');

describe('Inventory Gallery', () => {
    const owner = 'inventory_test_owner';
    const otherUser = 'inventory_test_other';
    let agent;

    // remove test users (and, by cascade, their clothing items)
    const cleanup = () => db.none(
        'DELETE FROM users WHERE username IN ($1, $2)',
        [owner, otherUser]
    );

    before(async () => {
        await cleanup();

        const hash = await bcrypt.hash('password123', 10);
        const insertUser = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id';
        const ownerId = await db.one(insertUser, [owner, hash], u => u.user_id);
        const otherId = await db.one(insertUser, [otherUser, hash], u => u.user_id);

        await db.none(
            `INSERT INTO clothing_items (user_id, name, category, style) VALUES
                ($1, 'Blue T-shirt', 'tops', 'casual'),
                ($1, 'Black Jeans', 'bottoms', NULL),
                ($2, 'Someone Elses Jacket', 'tops', NULL)`,
            [ownerId, otherId]
        );

        // agent keeps the session cookie between requests
        agent = chai.request.agent(app);
        await agent.post('/login').type('form').send({ username: owner, password: 'password123' });
    });

    after(async () => {
        agent.close();
        await cleanup();
    });

    it('should redirect to login when signed out', async () => {
        const res = await chai.request(app).get('/inventory').redirects(0);

        expect(res).to.have.status(302);
        expect(res).to.redirectTo('/login');
    });

    it("should show only the logged-in user's items", async () => {
        const res = await agent.get('/inventory');

        expect(res).to.have.status(200);
        expect(res.text).to.include('Blue T-shirt');
        expect(res.text).to.include('Black Jeans');
        expect(res.text).to.not.include('Someone Elses Jacket');
    });

    it('should filter items by category', async () => {
        const res = await agent.get('/inventory?category=bottoms');

        expect(res).to.have.status(200);
        expect(res.text).to.include('Black Jeans');
        expect(res.text).to.not.include('Blue T-shirt');
    });

    it('should show an empty message for a category with no items', async () => {
        const res = await agent.get('/inventory?category=shoes');

        expect(res).to.have.status(200);
        expect(res.text).to.include("You don't have any shoes in your inventory yet.");
    });

    it('should ignore an unknown category and show all items', async () => {
        const res = await agent.get('/inventory?category=hats');

        expect(res).to.have.status(200);
        expect(res.text).to.include('Blue T-shirt');
        expect(res.text).to.include('Black Jeans');
    });
});
