const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');

// first bytes of a real PNG file, followed by some filler
const pngBytes = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64, 1)
]);

// a real (tiny) photo in iPhone HEIC format
const heicBytes = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.heic'));

describe('Edit Clothing Item', () => {
    const owner = 'edit_item_test_owner';
    const otherUser = 'edit_item_test_other';
    let ownerAgent;
    let otherAgent;
    let itemId;

    // remove test users (and, by cascade, their clothing items)
    const cleanup = () => db.none(
        'DELETE FROM users WHERE username IN ($1, $2)',
        [owner, otherUser]
    );

    // the item as saved in the database, with its colors
    const loadItem = () => db.one(
        `SELECT name, category, item_type, style, details, brand, price_paid, image_data, image_type, updated_at,
                ARRAY(SELECT color FROM clothing_item_colors cc
                      WHERE cc.item_id = ci.item_id ORDER BY color) AS colors
         FROM clothing_items ci WHERE item_id = $1`,
        [itemId]
    );

    // submit the edit form; every field must be sent, like a browser does
    const submitEdit = (agent, changes = {}) => {
        const fields = {
            details: 'Edited details',
            category: 'tops',
            style: 'formal',
            brand: 'Gap',
            price_paid: '30',
            ...changes
        };
        const req = agent.post(`/inventory/${itemId}/edit`);
        Object.entries(fields).forEach(([key, value]) => {
            [].concat(value).forEach(v => req.field(key, v));
        });
        return req;
    };

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

    // start every test from the same saved item
    beforeEach(async () => {
        await db.none(
            `DELETE FROM clothing_items WHERE user_id = (SELECT user_id FROM users WHERE username = $1)`,
            [owner]
        );
        itemId = await db.one(
            `INSERT INTO clothing_items
                 (user_id, name, category, item_type, style, details, brand, price_paid, image_data, image_type, updated_at)
             SELECT user_id, 'Blue & White Blouse', 'tops', 'blouse', 'casual', 'Original details', 'Uniqlo', 19.99, $2, 'image/png',
                    NOW() - INTERVAL '1 day'
             FROM users WHERE username = $1
             RETURNING item_id`,
            [owner, pngBytes],
            row => row.item_id
        );
        await db.none(
            `INSERT INTO clothing_item_colors (item_id, color) VALUES ($1, 'blue'), ($1, 'white')`,
            [itemId]
        );
    });

    after(async () => {
        ownerAgent.close();
        otherAgent.close();
        await cleanup();
    });

    describe('GET /inventory/:id/edit', () => {
        it('should redirect to login when signed out', async () => {
            const res = await chai.request(app).get(`/inventory/${itemId}/edit`).redirects(0);

            expect(res).to.have.status(302);
            expect(res).to.redirectTo('/login');
        });

        it('should show the form filled in with the saved item', async () => {
            const res = await ownerAgent.get(`/inventory/${itemId}/edit`);

            expect(res).to.have.status(200);
            expect(res.text).to.include(`action="/inventory/${itemId}/edit"`);
            expect(res.text).to.include('Editing: Blue &amp; White Blouse');
            expect(res.text).to.match(/<option value="blouse" selected>/);
            expect(res.text).to.include('value="Original details"');
            expect(res.text).to.include('value="Uniqlo"');
            expect(res.text).to.include('value="19.99"');
            expect(res.text).to.match(/<option value="tops" selected>/);
            expect(res.text).to.match(/<option value="casual" selected>/);
            expect(res.text).to.match(/id="color-blue"[^>]*checked/);
            expect(res.text).to.match(/id="color-white"[^>]*checked/);
            expect(res.text).to.not.match(/id="color-red"[^>]*checked/);
            // shows the current photo and the option to remove it
            expect(res.text).to.include(`src="/inventory/${itemId}/image?v=`);
            expect(res.text).to.include('Remove photo');
        });

        it("should return 404 for someone else's item", async () => {
            const res = await otherAgent.get(`/inventory/${itemId}/edit`);

            expect(res).to.have.status(404);
        });

        it('should return 404 for an item id that is not a number', async () => {
            const res = await ownerAgent.get('/inventory/abc/edit');

            expect(res).to.have.status(404);
        });
    });

    describe('POST /inventory/:id/edit', () => {
        it('should save the changes and show them in the gallery', async () => {
            const res = await submitEdit(ownerAgent, { colors: ['red', 'black'], item_type: 'sweater' });

            expect(res).to.have.status(200);
            expect(res.text).to.include('Item updated!');
            expect(res.text).to.include('Edited details');
            expect(res.text).to.not.include('Original details');

            const item = await loadItem();
            // the name is regenerated from the new colors and type
            expect(item.name).to.equal('Black & Red Sweater');
            expect(item.item_type).to.equal('sweater');
            expect(item.details).to.equal('Edited details');
            expect(item.style).to.equal('formal');
            expect(item.brand).to.equal('Gap');
            expect(item.price_paid).to.equal('30.00');
            // the old colors are replaced, not added to
            expect(item.colors).to.deep.equal(['black', 'red']);
        });

        it('should clear optional fields left blank', async () => {
            await submitEdit(ownerAgent, { style: '', details: '', brand: '', price_paid: '' });

            const item = await loadItem();
            expect(item.name).to.equal('Top');
            expect(item.details).to.equal(null);
            expect(item.style).to.equal(null);
            expect(item.brand).to.equal(null);
            expect(item.price_paid).to.equal(null);
            expect(item.colors).to.deep.equal([]);
        });

        it('should keep the photo when no new one is uploaded', async () => {
            await submitEdit(ownerAgent);

            const item = await loadItem();
            expect(Buffer.compare(item.image_data, pngBytes)).to.equal(0);
            expect(item.image_type).to.equal('image/png');
        });

        it('should replace the photo, converting HEIC to JPEG', async () => {
            await submitEdit(ownerAgent).attach('image', heicBytes, 'IMG_0002.HEIC');

            const item = await loadItem();
            expect(item.image_type).to.equal('image/jpeg');
            expect([...item.image_data.subarray(0, 3)]).to.deep.equal([0xff, 0xd8, 0xff]);
        });

        it('should remove the photo when "Remove photo" is checked', async () => {
            await submitEdit(ownerAgent, { remove_photo: 'on' });

            const item = await loadItem();
            expect(item.image_data).to.equal(null);
            expect(item.image_type).to.equal(null);
        });

        it('should change the photo address so browsers load the new photo', async () => {
            const before = await loadItem();
            await submitEdit(ownerAgent).attach('image', heicBytes, 'IMG_0003.HEIC');
            const after = await loadItem();

            expect(after.updated_at.getTime()).to.be.greaterThan(before.updated_at.getTime());

            const version = await db.one(
                'SELECT EXTRACT(EPOCH FROM updated_at)::bigint AS v FROM clothing_items WHERE item_id = $1',
                [itemId],
                row => row.v
            );
            const gallery = await ownerAgent.get('/inventory');
            expect(gallery.text).to.include(`/inventory/${itemId}/image?v=${version}`);
        });

        it('should reject invalid changes, keep them on the form, and save nothing', async () => {
            const res = await submitEdit(ownerAgent, { category: '', brand: 'Typed Brand' });

            expect(res).to.have.status(400);
            expect(res.text).to.include('Please choose a category.');
            // still the edit form for this item, with what the user typed
            expect(res.text).to.include(`action="/inventory/${itemId}/edit"`);
            expect(res.text).to.include('value="Typed Brand"');

            const item = await loadItem();
            expect(item.details).to.equal('Original details');
            expect(item.brand).to.equal('Uniqlo');
        });

        it("should not let someone edit another user's item", async () => {
            const res = await submitEdit(otherAgent, { details: 'Hijacked' });

            expect(res).to.have.status(404);
            const item = await loadItem();
            expect(item.details).to.equal('Original details');
        });
    });

    describe('Gallery', () => {
        it('should link each card to its edit page', async () => {
            const res = await ownerAgent.get('/inventory');

            expect(res.text).to.include(`href="/inventory/${itemId}/edit"`);
        });
    });
});
