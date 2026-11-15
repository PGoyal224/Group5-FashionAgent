const { expect } = require('chai');
const { randomUUID } = require('crypto');
const db = require('../src/db');

describe('Database relationships', () => {
    let connection;
    let ownerId;
    let otherId;
    let outfitId;
    let itemId;

    beforeEach(async () => {
        connection = await db.connect();

        try {
            await connection.none('BEGIN');

            const addUser = `
                INSERT INTO users (username, password)
                VALUES ($1, $2) RETURNING user_id
            `;

            ownerId = (await connection.one(addUser, [
                `owner_${randomUUID()}`, 'test-only'
            ])).user_id;

            otherId = (await connection.one(addUser, [
                `other_${randomUUID()}`, 'test-only'
            ])).user_id;

            outfitId = (await connection.one(`
                INSERT INTO outfits (user_id, name)
                VALUES ($1, 'Test outfit') RETURNING outfit_id
            `, [ownerId])).outfit_id;

            itemId = (await connection.one(`
                INSERT INTO clothing_items (user_id, name, category)
                VALUES ($1, 'Test shirt', 'tops') RETURNING item_id
            `, [ownerId])).item_id;
        } catch (error) {
            await connection.none('ROLLBACK');
            connection.done();
            connection = null;
            throw error;
        }
    });

    afterEach(async () => {
        if (connection) {
            try {
                await connection.none('ROLLBACK');
            } finally {
                connection.done();
                connection = null;
            }
        }
    });

    const addRelationship = (userId) => connection.none(`
        INSERT INTO outfit_items (outfit_id, item_id, user_id)
        VALUES ($1, $2, $3)
    `, [outfitId, itemId, userId]);

    const expectDatabaseError = async (operation, code) => {
        let caught;

        try {
            await operation();
        } catch (error) {
            caught = error;
        }

        expect(caught, 'Expected the database to reject this change')
            .to.be.an('error');
        expect(caught.code).to.equal(code);
    };

    // checks clothes can be added to an outfit
    it('connects an outfit to clothing owned by the same user', async () => {
        await addRelationship(ownerId);

        const row = await connection.one(
            'SELECT user_id FROM outfit_items WHERE outfit_id = $1',
            [outfitId]
        );

        expect(row.user_id).to.equal(ownerId);
    });

    // blocks another user's clothes
    it('rejects clothing belonging to another user', async () => {
        await connection.none(
            'UPDATE clothing_items SET user_id = $1 WHERE item_id = $2',
            [otherId, itemId]
        );

        await expectDatabaseError(() => addRelationship(ownerId), '23503');
    });

    // blocks the wrong outfit owner
    it('rejects an incorrect outfit owner', async () => {
        await expectDatabaseError(() => addRelationship(otherId), '23503');
    });

    // blocks adding the same item twice
    it('rejects duplicate clothing in the same outfit', async () => {
        await addRelationship(ownerId);
        await expectDatabaseError(() => addRelationship(ownerId), '23505');
    });

    // deleting an outfit keeps the clothes
    it('removes relationships when an outfit is deleted', async () => {
        await addRelationship(ownerId);
        await connection.none(
            'DELETE FROM outfits WHERE outfit_id = $1', [outfitId]
        );

        expect(await connection.oneOrNone(
            'SELECT * FROM outfit_items WHERE outfit_id = $1', [outfitId]
        )).to.equal(null);

        expect(await connection.oneOrNone(
            'SELECT * FROM clothing_items WHERE item_id = $1', [itemId]
        )).to.not.equal(null);
    });

    // deleting clothes keeps the outfit
    it('removes relationships when clothing is deleted', async () => {
        await addRelationship(ownerId);
        await connection.none(
            'DELETE FROM clothing_items WHERE item_id = $1', [itemId]
        );

        expect(await connection.oneOrNone(
            'SELECT * FROM outfit_items WHERE outfit_id = $1', [outfitId]
        )).to.equal(null);

        expect(await connection.oneOrNone(
            'SELECT * FROM outfits WHERE outfit_id = $1', [outfitId]
        )).to.not.equal(null);
    });

    // deleting a user removes their stuff
    it('removes a deleted user’s outfits, clothing, and relationships', async () => {
        await addRelationship(ownerId);
        await connection.none(
            'DELETE FROM users WHERE user_id = $1', [ownerId]
        );

        for (const table of ['outfits', 'clothing_items', 'outfit_items']) {
            const row = await connection.one(
                `SELECT COUNT(*)::int AS count FROM ${table} WHERE user_id = $1`,
                [ownerId]
            );

            expect(row.count).to.equal(0);
        }
    });
});