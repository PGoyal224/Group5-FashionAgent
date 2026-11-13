const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');
const { MAX_IMAGE_BYTES } = require('../src/validateClothingItem');

// first bytes of a real PNG file, followed by some filler
const pngBytes = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64, 1)
]);

describe('Add Clothing Item', () => {
    const owner = 'add_item_test_owner';
    const otherUser = 'add_item_test_other';
    let ownerAgent;
    let otherAgent;

    // remove test users (and, by cascade, their clothing items)
    const cleanup = () => db.none(
        'DELETE FROM users WHERE username IN ($1, $2)',
        [owner, otherUser]
    );

    // count the owner's items with this name
    const countItems = name => db.one(
        `SELECT COUNT(*)::int AS count FROM clothing_items c
         JOIN users u ON u.user_id = c.user_id
         WHERE u.username = $1 AND c.name = $2`,
        [owner, name],
        row => row.count
    );

    before(async () => {
        await cleanup();

        const hash = await bcrypt.hash('password123', 10);
        await db.none(
            'INSERT INTO users (username, password) VALUES ($1, $3), ($2, $3)',
            [owner, otherUser, hash]
        );

        // agents keep the session cookie between requests
        ownerAgent = chai.request.agent(app);
        await ownerAgent.post('/login').type('form').send({ username: owner, password: 'password123' });
        otherAgent = chai.request.agent(app);
        await otherAgent.post('/login').type('form').send({ username: otherUser, password: 'password123' });
    });

    after(async () => {
        ownerAgent.close();
        otherAgent.close();
        await cleanup();
    });

    it('should redirect to login when signed out', async () => {
        const res = await chai.request(app).get('/inventory/add').redirects(0);

        expect(res).to.have.status(302);
        expect(res).to.redirectTo('/login');
    });

    it('should show the add item form when signed in', async () => {
        const res = await ownerAgent.get('/inventory/add');

        expect(res).to.have.status(200);
        expect(res.text).to.include('enctype="multipart/form-data"');
    });

    it('should save a valid item with a PNG photo and show it in the gallery', async () => {
        const res = await ownerAgent
            .post('/inventory/add')
            .field('name', 'Uploaded Shirt')
            .field('category', 'tops')
            .field('colors', 'green')
            .field('colors', 'white')
            .field('style', 'casual')
            .field('brand', 'Uniqlo')
            .field('price_paid', '24.99')
            .attach('image', pngBytes, 'shirt.png');

        // redirected back to the gallery with a success message
        expect(res).to.have.status(200);
        expect(res.text).to.include('Item added to your inventory!');
        expect(res.text).to.include('Uploaded Shirt');
        expect(res.text).to.include('Uniqlo');
        expect(res.text).to.include('Paid $24.99');
        expect(await countItems('Uploaded Shirt')).to.equal(1);
    });

    it('should save blank brand and price paid as empty (NULL)', async () => {
        await ownerAgent
            .post('/inventory/add')
            .field('name', 'No Brand Socks')
            .field('category', 'accessories')
            .field('brand', '')
            .field('price_paid', '')
            .attach('image', pngBytes, 'socks.png');

        const item = await db.one(
            'SELECT brand, price_paid FROM clothing_items WHERE name = $1',
            ['No Brand Socks']
        );
        expect(item.brand).to.equal(null);
        expect(item.price_paid).to.equal(null);
    });

    it('should reject an invalid price and keep the form filled in', async () => {
        const res = await ownerAgent
            .post('/inventory/add')
            .field('name', 'Bad Price Item')
            .field('category', 'tops')
            .field('brand', 'Gap')
            .field('price_paid', '12.345')
            .attach('image', pngBytes, 'shirt.png');

        expect(res).to.have.status(400);
        expect(res.text).to.include('Price paid must be a number like 25 or 19.99.');
        expect(res.text).to.include('value="Gap"');
        expect(await countItems('Bad Price Item')).to.equal(0);
    });

    it('should save every chosen color for the item', async () => {
        const colors = await db.map(
            `SELECT cc.color FROM clothing_item_colors cc
             JOIN clothing_items ci ON ci.item_id = cc.item_id
             WHERE ci.name = $1 ORDER BY cc.color`,
            ['Uploaded Shirt'],
            row => row.color
        );

        expect(colors).to.deep.equal(['green', 'white']);
    });

    it('should not save the item or its colors when a color is invalid', async () => {
        const res = await ownerAgent
            .post('/inventory/add')
            .field('name', 'Bad Color Item')
            .field('category', 'tops')
            .field('colors', 'white')
            .field('colors', 'chartreuse')
            .attach('image', pngBytes, 'shirt.png');

        expect(res).to.have.status(400);
        expect(res.text).to.include('Please choose colors from the list.');
        // the valid color stays checked on the re-shown form
        expect(res.text).to.match(/id="color-white"[^>]*checked/);
        expect(await countItems('Bad Color Item')).to.equal(0);
    });

    it('should serve the photo to its owner only', async () => {
        const item = await db.one(
            'SELECT item_id FROM clothing_items WHERE name = $1',
            ['Uploaded Shirt']
        );

        const ownerRes = await ownerAgent.get(`/inventory/${item.item_id}/image`).buffer(true);
        expect(ownerRes).to.have.status(200);
        expect(ownerRes).to.have.header('content-type', 'image/png');
        expect(Buffer.compare(ownerRes.body, pngBytes)).to.equal(0);

        const otherRes = await otherAgent.get(`/inventory/${item.item_id}/image`);
        expect(otherRes).to.have.status(404);
    });

    it('should reject a file that is not a PNG or JPEG', async () => {
        const res = await ownerAgent
            .post('/inventory/add')
            .field('name', 'Fake Photo Item')
            .field('category', 'tops')
            .attach('image', Buffer.from('not really an image'), 'fake.png');

        expect(res).to.have.status(400);
        expect(res.text).to.include('Photo must be a PNG or JPEG file.');
        // the form keeps what the user typed
        expect(res.text).to.include('value="Fake Photo Item"');
        expect(await countItems('Fake Photo Item')).to.equal(0);
    });

    it('should reject a photo over 5 MB', async () => {
        const bigPng = Buffer.concat([pngBytes, Buffer.alloc(MAX_IMAGE_BYTES)]);
        const res = await ownerAgent
            .post('/inventory/add')
            .field('name', 'Huge Photo Item')
            .field('category', 'tops')
            .attach('image', bigPng, 'huge.png');

        expect(res).to.have.status(400);
        expect(res.text).to.include('Photo must be 5 MB or smaller.');
        expect(await countItems('Huge Photo Item')).to.equal(0);
    });

    it('should reject an item with no name', async () => {
        const res = await ownerAgent
            .post('/inventory/add')
            .field('name', '')
            .field('category', 'tops')
            .attach('image', pngBytes, 'shirt.png');

        expect(res).to.have.status(400);
        expect(res.text).to.include('Please enter a name for the item.');
    });
});
