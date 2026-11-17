const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const expect = chai.expect;

chai.use(chaiHttp);

const app = require('../src/app');
const db = require('../src/db');

describe('Saved Outfits', () => {
    const suffix = randomUUID();
    const owner = `outfit_owner_${suffix}`;
    const otherUser = `outfit_other_${suffix}`;
    const emptyUser = `outfit_empty_${suffix}`;
    let ownerAgent;
    let emptyAgent;
    let ownerId;
    let otherId;
    let ownerItemId;
    let secondOwnerItemId;
    let thirdOwnerItemId;
    let otherItemId;
    let ownerOutfitId;
    let otherOutfitId;

    const cleanup = () => db.none(
        'DELETE FROM users WHERE username IN ($1, $2, $3)',
        [owner, otherUser, emptyUser]
    );

    before(async () => {
        await cleanup();
        const hash = await bcrypt.hash('password123', 10);
        const insertUser = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING user_id';
        ownerId = await db.one(insertUser, [owner, hash], user => user.user_id);
        otherId = await db.one(insertUser, [otherUser, hash], user => user.user_id);
        await db.one(insertUser, [emptyUser, hash]);

        ownerItemId = await db.one(
            `INSERT INTO clothing_items (user_id, name, category)
             VALUES ($1, 'Owner jacket', 'outerwear') RETURNING item_id`,
            [ownerId],
            item => item.item_id
        );
        secondOwnerItemId = await db.one(
            `INSERT INTO clothing_items (user_id, name, category)
             VALUES ($1, 'Owner boots', 'shoes') RETURNING item_id`,
            [ownerId],
            item => item.item_id
        );
        thirdOwnerItemId = await db.one(
            `INSERT INTO clothing_items (user_id, name, category)
             VALUES ($1, 'Owner shirt', 'tops') RETURNING item_id`,
            [ownerId],
            item => item.item_id
        );
        otherItemId = await db.one(
            `INSERT INTO clothing_items (user_id, name, category)
             VALUES ($1, 'Other shirt', 'tops') RETURNING item_id`,
            [otherId],
            item => item.item_id
        );

        ownerOutfitId = await db.one(
            `INSERT INTO outfits (user_id, name) VALUES ($1, 'Weekend look') RETURNING outfit_id`,
            [ownerId],
            outfit => outfit.outfit_id
        );
        otherOutfitId = await db.one(
            `INSERT INTO outfits (user_id, name) VALUES ($1, 'Private look') RETURNING outfit_id`,
            [otherId],
            outfit => outfit.outfit_id
        );
        await db.none(
            'INSERT INTO outfit_items (outfit_id, item_id, user_id) VALUES ($1, $2, $3)',
            [ownerOutfitId, ownerItemId, ownerId]
        );

        ownerAgent = chai.request.agent(app);
        emptyAgent = chai.request.agent(app);
        await ownerAgent.post('/login').type('form').send({ username: owner, password: 'password123' });
        await emptyAgent.post('/login').type('form').send({ username: emptyUser, password: 'password123' });
    });

    after(async () => {
        ownerAgent?.close();
        emptyAgent?.close();
        await cleanup();
    });

    it('redirects signed-out visitors to login', async () => {
        const res = await chai.request(app).get('/outfits').redirects(0);

        expect(res).to.have.status(302);
        expect(res).to.redirectTo('/login');
    });

    it("lists only the signed-in user's outfits with a preview placeholder", async () => {
        const res = await ownerAgent.get('/outfits');

        expect(res).to.have.status(200);
        expect(res.text).to.include('Weekend look');
        expect(res.text).to.include('1 pieces');
        expect(res.text).to.include('Outfit preview');
        expect(res.text).to.not.include('Private look');
    });

    it('shows outfit details only to the owner', async () => {
        const ownRes = await ownerAgent.get(`/outfits/${ownerOutfitId}`);
        const otherRes = await ownerAgent.get(`/outfits/${otherOutfitId}`);

        expect(ownRes).to.have.status(200);
        expect(ownRes.text).to.include('Owner jacket');
        expect(otherRes).to.have.status(404);
    });

    it('creates an outfit from the owner’s inventory and reflects it in the list', async () => {
        const saveRes = await ownerAgent.post('/outfits').type('form').send({
            name: 'Dinner look',
            occasion: 'Dinner',
            item_ids: [String(ownerItemId), String(secondOwnerItemId), String(thirdOwnerItemId)]
        }).redirects(0);

        expect(saveRes).to.have.status(302);
        expect(saveRes).to.redirectTo('/outfits');

        const listRes = await ownerAgent.get('/outfits');
        expect(listRes.text).to.include('Dinner look');
        expect(listRes.text).to.include('3 pieces');
        expect(listRes.text).to.include('Outfit saved!');

        const refreshedListRes = await ownerAgent.get('/outfits');
        expect(refreshedListRes.text).to.not.include('Outfit saved!');

        const saved = await db.one(
            'SELECT outfit_id FROM outfits WHERE user_id = $1 AND name = $2',
            [ownerId, 'Dinner look']
        );
        const savedItems = await db.any(
            'SELECT item_id FROM outfit_items WHERE outfit_id = $1 ORDER BY item_id',
            [saved.outfit_id]
        );
        expect(savedItems.map(item => item.item_id)).to.have.members([
            ownerItemId, secondOwnerItemId, thirdOwnerItemId
        ]);
    });

    it('rejects adding another user’s clothing item', async () => {
        const res = await ownerAgent.post('/outfits').type('form').send({
            name: 'Invalid look',
            item_ids: String(otherItemId)
        });

        expect(res).to.have.status(400);
        expect(res.text).to.include('You can only add clothing from your own inventory.');
        expect(await db.oneOrNone(
            'SELECT outfit_id FROM outfits WHERE user_id = $1 AND name = $2',
            [ownerId, 'Invalid look']
        )).to.equal(null);
    });

    it('edits an outfit and replaces its selected clothing', async () => {
        const res = await ownerAgent.post(`/outfits/${ownerOutfitId}`).type('form').send({
            name: 'Updated weekend look',
            item_ids: String(secondOwnerItemId)
        }).redirects(0);

        expect(res).to.have.status(302);
        expect(res).to.redirectTo('/outfits');
        const outfit = await db.one('SELECT name FROM outfits WHERE outfit_id = $1', [ownerOutfitId]);
        const items = await db.any('SELECT item_id FROM outfit_items WHERE outfit_id = $1', [ownerOutfitId]);
        expect(outfit.name).to.equal('Updated weekend look');
        expect(items.map(item => item.item_id)).to.deep.equal([secondOwnerItemId]);
    });

    it('deletes an owned outfit and displays the empty state when none remain', async () => {
        const deleteRes = await ownerAgent.post(`/outfits/${ownerOutfitId}/delete`).redirects(0);

        expect(deleteRes).to.have.status(302);
        expect(deleteRes).to.redirectTo('/outfits');
        const ownerListRes = await ownerAgent.get('/outfits');
        expect(ownerListRes.text).to.include('Outfit deleted.');
        expect((await ownerAgent.get('/outfits')).text).to.not.include('Outfit deleted.');

        const emptyRes = await emptyAgent.get('/outfits');
        expect(emptyRes).to.have.status(200);
        expect(emptyRes.text).to.include("You haven't saved any outfits yet.");
        expect(emptyRes.text).to.include('href="/outfits/new"');
    });
});
