const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');

describe('Delete Clothing Item', () => {
    const owner = 'delete_item_test_owner';
    const otherUser = 'delete_item_test_other';
    let ownerAgent;
    let otherAgent;
    let ownerId;
    let itemId;

    // remove test users (and, by cascade, their items and outfits)
    const cleanup = () => db.none(
        'DELETE FROM users WHERE username IN ($1, $2)',
        [owner, otherUser]
    );

    const itemExists = () => db.oneOrNone(
        'SELECT item_id FROM clothing_items WHERE item_id = $1',
        [itemId]
    ).then(row => row !== null);

    // add the test item to a new saved outfit
    const addToOutfit = name => db.one(
        'INSERT INTO outfits (user_id, name) VALUES ($1, $2) RETURNING outfit_id',
        [ownerId, name],
        row => row.outfit_id
    ).then(async outfitId => {
        await db.none(
            'INSERT INTO outfit_items (outfit_id, item_id, user_id) VALUES ($1, $2, $3)',
            [outfitId, itemId, ownerId]
        );
        return outfitId;
    });

    // submit the confirmation popup's form
    const confirmDelete = agent => agent
        .post(`/inventory/${itemId}/delete`)
        .type('form')
        .send({ confirm: 'yes' });

    before(async () => {
        await cleanup();

        const hash = await bcrypt.hash('password123', 10);
        ownerId = await db.one(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id',
            [owner, hash],
            row => row.user_id
        );
        await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [otherUser, hash]);

        // agents keep the session cookie between requests
        ownerAgent = chai.request.agent(app);
        await ownerAgent.post('/login').type('form').send({ username: owner, password: 'password123' });
        otherAgent = chai.request.agent(app);
        await otherAgent.post('/login').type('form').send({ username: otherUser, password: 'password123' });
    });

    // start every test from the same saved item, with no outfits
    beforeEach(async () => {
        await db.none('DELETE FROM outfits WHERE user_id = $1', [ownerId]);
        await db.none('DELETE FROM clothing_items WHERE user_id = $1', [ownerId]);
        itemId = await db.one(
            `INSERT INTO clothing_items (user_id, name, category)
             VALUES ($1, 'Doomed Sweater', 'tops') RETURNING item_id`,
            [ownerId],
            row => row.item_id
        );
        await db.none(
            `INSERT INTO clothing_item_colors (item_id, color) VALUES ($1, 'green')`,
            [itemId]
        );
    });

    after(async () => {
        ownerAgent.close();
        otherAgent.close();
        await cleanup();
    });

    describe('Confirmation popup', () => {
        it('should be on the edit page, naming the item and warning it cannot be undone', async () => {
            const res = await ownerAgent.get(`/inventory/${itemId}/edit`);

            expect(res.text).to.include('data-bs-target="#deleteItemModal"');
            expect(res.text).to.include('Delete this item?');
            expect(res.text).to.include('<strong>Doomed Sweater</strong> will be permanently removed');
            expect(res.text).to.include("This can't be undone.");
            expect(res.text).to.include(`action="/inventory/${itemId}/delete"`);
        });

        it('should not mention outfits when the item is in none', async () => {
            const res = await ownerAgent.get(`/inventory/${itemId}/edit`);

            expect(res.text).to.not.include('saved outfit');
        });

        it('should warn how many saved outfits the item will be removed from', async () => {
            await addToOutfit('Monday');
            let res = await ownerAgent.get(`/inventory/${itemId}/edit`);
            expect(res.text).to.include('It will also be removed from 1 saved outfit.');

            await addToOutfit('Friday');
            res = await ownerAgent.get(`/inventory/${itemId}/edit`);
            expect(res.text).to.include('It will also be removed from 2 saved outfits.');
        });

        it('should not appear on the add item form', async () => {
            const res = await ownerAgent.get('/inventory/add');

            expect(res.text).to.not.include('deleteItemModal');
        });
    });

    describe('POST /inventory/:id/delete', () => {
        it('should redirect to login when signed out', async () => {
            const res = await chai.request(app)
                .post(`/inventory/${itemId}/delete`)
                .type('form')
                .send({ confirm: 'yes' })
                .redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo('/login');
            expect(await itemExists()).to.equal(true);
        });

        it('should delete the item and its colors once confirmed', async () => {
            const res = await confirmDelete(ownerAgent);

            expect(res).to.have.status(200);
            expect(res.text).to.include('Item deleted.');
            expect(res.text).to.not.include('Doomed Sweater');
            expect(await itemExists()).to.equal(false);

            const colors = await db.any('SELECT * FROM clothing_item_colors WHERE item_id = $1', [itemId]);
            expect(colors).to.have.length(0);
        });

        it('should not delete without the confirmation from the popup', async () => {
            const res = await ownerAgent
                .post(`/inventory/${itemId}/delete`)
                .type('form')
                .send({})
                .redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo(`/inventory/${itemId}/edit`);
            expect(await itemExists()).to.equal(true);
        });

        it('should remove the item from saved outfits but keep the outfits', async () => {
            const outfitId = await addToOutfit('Weekend');

            await confirmDelete(ownerAgent);

            const links = await db.any('SELECT * FROM outfit_items WHERE item_id = $1', [itemId]);
            expect(links).to.have.length(0);
            const outfit = await db.oneOrNone('SELECT outfit_id FROM outfits WHERE outfit_id = $1', [outfitId]);
            expect(outfit).to.not.equal(null);
        });

        it('should not delete or crash when the request has no form data at all', async () => {
            const res = await ownerAgent
                .post(`/inventory/${itemId}/delete`)
                .redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo(`/inventory/${itemId}/edit`);
            expect(await itemExists()).to.equal(true);
        });

        it("should not let someone delete another user's item", async () => {
            const res = await confirmDelete(otherAgent);

            expect(res).to.have.status(404);
            expect(await itemExists()).to.equal(true);
        });

        it('should return 404 for an item that no longer exists', async () => {
            await confirmDelete(ownerAgent);
            const res = await confirmDelete(ownerAgent);

            expect(res).to.have.status(404);
        });
    });
});
