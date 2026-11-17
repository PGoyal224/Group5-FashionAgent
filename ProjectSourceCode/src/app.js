// *****************************************************
// Section 1: Import Dependencies
// *****************************************************

const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const app = express();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./db');
const validateRegistration = require('./validateRegistration');
const multer = require('multer');
const {
    validateClothingItem,
    hasPhoto,
    parsePrice,
    toList,
    MAX_IMAGE_BYTES
} = require('./validateClothingItem');
const { CATEGORIES, TYPES, COLORS, STYLES, optionLabel, generateItemName } = require('./clothingOptions');
const preparePhoto = require('./preparePhoto');

// *****************************************************
// Section 2: Configure Handlebars
// *****************************************************

app.engine('hbs', handlebars.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// *****************************************************
// Section 3: Database Configuration
// *****************************************************


// Serve static files (css, js, img) from src/resources at /resources/...
app.use('/resources', express.static(path.join(__dirname, 'resources')));

// Allow Express to read the username and password through req.body
app.use(express.urlencoded({ extended: true }));

// Sessions: keeps track of the logged-in user between requests.
// SESSION_SECRET comes from the .env file (see .env.example).
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    saveUninitialized: false,
    resave: false
}));

// Make the logged-in user (if any) available to every template as {{user}}
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Route guard: redirect to /login when there is no user in the session.
// Use on any route that shows password-protected information.
const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};


// *****************************************************
// Section 4: Routes
// *****************************************************

app.get('/', (req, res) => {
    res.render('pages/home');
});

// Register GET route
app.get('/register', (req, res) => {
    // login redirects here with ?reason=nouser when the username doesn't exist
    if (req.query.reason === 'nouser') {
        return res.render('pages/register', {
            message: 'No account found with that username. Please create one.',
            error: true
        });
    }
    res.render('pages/register');
});

// Register POST route
app.post('/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const validationError = validateRegistration(
    username,
    password,
    req.body.confirmPassword
    );

    if (validationError) {
        return res.render('pages/register', {
            message: validationError,
            error: true
        });
    }

    try{
        // hash password using bcrypt
        const hash = await bcrypt.hash(req.body.password, 10);

        // insert username and hashed password into users table
        const query = `INSERT INTO users (username, password) VALUES ($1, $2)`;

        await db.none(query, [req.body.username, hash]);

        // redirect after success
        res.render('pages/register', {
            message: 'Account created successfully!',
            error: false
        });
    } catch (error) {
        console.log(error);
        
        if (error.code === '23505'){
            // PostgreSQL unique constraint violation
            res.render('pages/register', {
                message: 'That username is already taken',
                error: true
            });
        } else {
            res.status(500).render('pages/register', {
                message: 'Something went wrong, please try again',
                error: true
            });
        }
    }
});


// Login GET route
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('pages/login');
});

// Login POST route
app.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // check for missing fields
    if (!username || !password || !username.trim() || !password.trim()) {
        return res.render('pages/login', {
            message: 'Please fill out all fields.',
            error: true
        });
    }

    try {
        // look up the user by username
        const query = `SELECT user_id, username, password FROM users WHERE username = $1`;
        const user = await db.oneOrNone(query, [username.trim()]);

        // no account with that username -> send them to registration
        if (!user) {
            return res.redirect('/register?reason=nouser');
        }

        // compare the submitted password with the stored bcrypt hash
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.render('pages/login', {
                message: 'Incorrect password. Please try again.',
                error: true
            });
        }

        // successful login -> store the user in the session and go to the dashboard
        req.session.user = { user_id: user.user_id, username: user.username };
        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/login', {
            message: 'Something went wrong, please try again',
            error: true
        });
    }
});


// Dashboard (requires login)
app.get('/dashboard', auth, (req, res) => {
    res.render('pages/dashboard', { username: req.session.user.username });
});

// account page (requires login)
app.get('/account', auth, async (req, res) => {
    const user_id = req.session.user.user_id;

    const clothingCount = await db.one(`SELECT COUNT(*) FROM clothing_items WHERE user_id = $1`, [user_id]);
    const outfitCount = await db.one(`SELECT COUNT(*) FROM outfits WHERE user_id = $1`, [user_id]);

    res.render('pages/account', {
        username: req.session.user.username,
        clothingCount: clothingCount.count,
        outfitCount: outfitCount.count
    });
});


// <option>s for a dropdown, with the previously chosen one selected
const selectOptions = (values, selected) => values.map(v => ({
    value: v,
    label: optionLabel(v),
    selected: v === selected
}));

// color swatch checkboxes, with the previously chosen ones checked
const colorOptions = selected => COLORS.map(c => ({
    ...c,
    checked: selected.includes(c.value)
}));

const parseOutfitItemIds = value => {
    if (value === undefined) {
        return [];
    }

    const values = Array.isArray(value) ? value : [value];
    if (values.some(id => typeof id !== 'string' || !/^\d{1,10}$/.test(id))) {
        return null;
    }

    const ids = [...new Set(values.map(Number))];
    return ids.every(id => id > 0 && id <= 2147483647) ? ids : null;
};

const validateOutfitFields = fields => {
    const { name, description, weather, occasion } = fields;
    if (typeof name !== 'string' || !name.trim()) {
        return 'Please enter an outfit name.';
    }
    if (name.trim().length > 100) {
        return 'Outfit names must be 100 characters or fewer.';
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
        return 'Descriptions must be 2000 characters or fewer.';
    }
    if (weather && (typeof weather !== 'string' || weather.length > 50)) {
        return 'Weather must be 50 characters or fewer.';
    }
    if (occasion && (typeof occasion !== 'string' || occasion.length > 100)) {
        return 'Occasions must be 100 characters or fewer.';
    }
    return null;
};

const outfitFormView = async (userId, fields = {}, selectedIds = []) => {
    const clothing = await db.any(
        `SELECT item_id, name, category, (image_data IS NOT NULL) AS has_image
         FROM clothing_items WHERE user_id = $1
         ORDER BY created_at DESC, item_id DESC`,
        [userId]
    );
    return {
        ...fields,
        clothing: clothing.map(item => ({
            ...item,
            selected: selectedIds.includes(item.item_id)
        }))
    };
};

const parseOutfitId = value => {
    if (!/^\d{1,10}$/.test(value)) {
        return 0;
    }
    const id = Number(value);
    return id > 0 && id <= 2147483647 ? id : 0;
};

// Type <option>s for every category, so the form can switch the Type
// dropdown when the category changes (see the script in item-form.hbs)
const typeOptionsJson = JSON.stringify(
    Object.fromEntries(CATEGORIES.map(c => [c, selectOptions(TYPES[c], null)]))
);

// Everything the add/edit item form needs.
// fields holds what to fill in: what the user entered, or the saved item when editing.
// item is the saved item when editing, or undefined when adding.
const itemForm = (fields = {}, item) => ({
    details: fields.details,
    brand: fields.brand,
    price_paid: fields.price_paid,
    categories: selectOptions(CATEGORIES, fields.category),
    // types for the chosen category only; empty until a category is chosen
    types: selectOptions(TYPES[fields.category] || [], fields.item_type),
    typeOptionsJson,
    styles: selectOptions(STYLES, fields.style),
    colors: colorOptions(toList(fields.colors)),
    editing: Boolean(item),
    action: item ? `/inventory/${item.item_id}/edit` : '/inventory/add',
    item
});

// Photo uploads: keep the file in memory so it can be checked, converted
// if needed, and saved to the clothing_items table. Rejects anything over 5 MB.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 }
});

// Read a submitted add/edit item form, including its photo upload.
// If anything is wrong, calls showError(fields, status, message) and returns null.
// Otherwise returns the values ready to save.
const readItemForm = (req, res, showError) => new Promise((resolve) => {
    // run the upload here (not as route middleware) so upload errors,
    // like a file that's too big, can be shown on the form
    upload.single('image')(req, res, async (uploadError) => {
        const fields = req.body || {};
        const fail = (status, message) => {
            showError(fields, status, message);
            resolve(null);
        };

        if (uploadError) {
            if (uploadError.code === 'LIMIT_FILE_SIZE') {
                return fail(400, 'Photo must be 5 MB or smaller.');
            }
            console.log(uploadError);
            return fail(400, 'Could not read the upload, please try again.');
        }

        const validationError = validateClothingItem(fields, req.file);
        if (validationError) {
            return fail(400, validationError);
        }

        // get the photo (if any) ready to save, e.g. convert iPhone HEIC to JPEG
        let photo = null;
        if (hasPhoto(req.file)) {
            try {
                photo = await preparePhoto(req.file.buffer);
            } catch (error) {
                console.log(error);
                return fail(400, 'Could not read that photo. Try saving it as a JPEG and uploading it again.');
            }
        }

        // optional text fields are saved as NULL when left blank
        const optional = value => (value && value.trim() ? value.trim() : null);

        const colors = toList(fields.colors);

        resolve({
            fields,
            name: generateItemName(fields.category, colors, fields.item_type),
            category: fields.category,
            item_type: fields.item_type || null,
            style: fields.style || null,
            details: optional(fields.details),
            brand: optional(fields.brand),
            price_paid: parsePrice(fields.price_paid),
            colors,
            photo,
            // edit form only: the "Remove photo" checkbox
            removePhoto: fields.remove_photo === 'on'
        });
    });
});

// Replace an item's colors with a new list (inside a transaction t)
const saveItemColors = async (t, itemId, colors) => {
    await t.none('DELETE FROM clothing_item_colors WHERE item_id = $1', [itemId]);
    // one row per color
    for (const color of colors) {
        await t.none(
            'INSERT INTO clothing_item_colors (item_id, color) VALUES ($1, $2)',
            [itemId, color]
        );
    }
};

// item_id from the URL, or null if it can't be a PostgreSQL INT
const parseItemId = param => {
    const itemId = /^\d{1,10}$/.test(param) ? Number(param) : 0;
    return itemId >= 1 && itemId <= 2147483647 ? itemId : null;
};

// One of the logged-in user's items with its colors (not the photo itself)
// and how many saved outfits use it, or null if it doesn't exist or belongs to someone else
const findUserItem = async (itemId, userId) => {
    const item = await db.oneOrNone(
        `SELECT ci.item_id, ci.name, ci.category, ci.item_type, ci.style, ci.details, ci.brand, ci.price_paid,
                (ci.image_data IS NOT NULL) AS has_image,
                EXTRACT(EPOCH FROM ci.updated_at)::bigint AS version,
                ARRAY(SELECT color FROM clothing_item_colors cc
                      WHERE cc.item_id = ci.item_id) AS colors,
                (SELECT COUNT(*)::int FROM outfit_items oi
                 WHERE oi.item_id = ci.item_id) AS outfit_count
         FROM clothing_items ci
         WHERE ci.item_id = $1 AND ci.user_id = $2`,
        [itemId, userId]
    );
    if (item) {
        // for "1 saved outfit" vs "2 saved outfits" in the delete popup
        item.in_one_outfit = item.outfit_count === 1;
    }
    return item;
};

// Add clothing item form (requires login)
app.get('/inventory/add', auth, (req, res) => {
    res.render('pages/item-form', itemForm());
});

// Add clothing item: save the details and uploaded photo, then go back to the gallery
app.post('/inventory/add', auth, async (req, res) => {
    // re-show the form with the user's entries still filled in
    const showError = (fields, status, message) => res.status(status).render('pages/item-form', {
        ...itemForm(fields),
        message,
        error: true
    });

    const values = await readItemForm(req, res, showError);
    if (!values) {
        return;
    }

    try {
        // save the item and its colors together: if either fails, neither is saved
        await db.tx(async t => {
            const query = `INSERT INTO clothing_items
                               (user_id, name, category, item_type, style, details, brand, price_paid, image_data, image_type)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                           RETURNING item_id`;
            const item = await t.one(query, [
                req.session.user.user_id,
                values.name,
                values.category,
                values.item_type,
                values.style,
                values.details,
                values.brand,
                values.price_paid,
                values.photo ? values.photo.data : null,
                values.photo ? values.photo.type : null
            ]);

            await saveItemColors(t, item.item_id, values.colors);
        });

        res.redirect('/inventory?added=1');
    } catch (error) {
        console.log(error);
        showError(values.fields, 500, 'Something went wrong, please try again');
    }
});

// Edit clothing item form, filled in with the saved item (requires login).
// Only the item's owner can edit it; everyone else gets a 404.
app.get('/inventory/:id/edit', auth, async (req, res) => {
    const itemId = parseItemId(req.params.id);
    if (!itemId) {
        return res.sendStatus(404);
    }

    try {
        const item = await findUserItem(itemId, req.session.user.user_id);
        if (!item) {
            return res.sendStatus(404);
        }

        res.render('pages/item-form', itemForm(item, item));
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// Edit clothing item: save the changes, then go back to the gallery.
// The photo is kept unless a new one is uploaded or "Remove photo" is checked.
app.post('/inventory/:id/edit', auth, async (req, res) => {
    const itemId = parseItemId(req.params.id);
    if (!itemId) {
        return res.sendStatus(404);
    }

    let item;
    try {
        // check ownership before reading the upload
        item = await findUserItem(itemId, req.session.user.user_id);
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
    if (!item) {
        return res.sendStatus(404);
    }

    // re-show the form with the user's changes still filled in
    const showError = (fields, status, message) => res.status(status).render('pages/item-form', {
        ...itemForm(fields, item),
        message,
        error: true
    });

    const values = await readItemForm(req, res, showError);
    if (!values) {
        return;
    }

    // a new photo wins over "Remove photo"
    const changePhoto = Boolean(values.photo) || values.removePhoto;

    try {
        // save the item and its colors together: if either fails, neither is saved
        await db.tx(async t => {
            const query = `UPDATE clothing_items
                           SET name = $3, category = $4, item_type = $5, style = $6, details = $7,
                               brand = $8, price_paid = $9,
                               image_data = CASE WHEN $10 THEN $11 ELSE image_data END,
                               image_type = CASE WHEN $10 THEN $12 ELSE image_type END,
                               updated_at = NOW()
                           WHERE item_id = $1 AND user_id = $2`;
            await t.none(query, [
                itemId,
                req.session.user.user_id,
                values.name,
                values.category,
                values.item_type,
                values.style,
                values.details,
                values.brand,
                values.price_paid,
                changePhoto,
                values.photo ? values.photo.data : null,
                values.photo ? values.photo.type : null
            ]);

            await saveItemColors(t, itemId, values.colors);
        });

        res.redirect('/inventory?updated=1');
    } catch (error) {
        console.log(error);
        showError(values.fields, 500, 'Something went wrong, please try again');
    }
});

// Delete clothing item (requires login), then go back to the gallery.
// Only the item's owner can delete it; everyone else gets a 404.
// Its colors and its place in any saved outfits are removed with it (ON DELETE CASCADE).
app.post('/inventory/:id/delete', auth, async (req, res) => {
    const itemId = parseItemId(req.params.id);
    if (!itemId) {
        return res.sendStatus(404);
    }

    // only delete when the request comes from the confirmation popup.
    // (req.body is undefined when a request has no form data at all)
    if ((req.body || {}).confirm !== 'yes') {
        return res.redirect(`/inventory/${itemId}/edit`);
    }

    try {
        const deleted = await db.oneOrNone(
            'DELETE FROM clothing_items WHERE item_id = $1 AND user_id = $2 RETURNING item_id',
            [itemId, req.session.user.user_id]
        );
        if (!deleted) {
            return res.sendStatus(404);
        }

        res.redirect('/inventory?deleted=1');
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// Clothing item photo (requires login). Only the item's owner can see it;
// everyone else gets a 404 so they can't tell which item ids exist.
// Pages add ?v=<last updated time> so a replaced photo isn't shown from the browser cache.
app.get('/inventory/:id/image', auth, async (req, res) => {
    const itemId = parseItemId(req.params.id);
    if (!itemId) {
        return res.sendStatus(404);
    }

    try {
        const query = `SELECT image_data, image_type
                       FROM clothing_items
                       WHERE item_id = $1 AND user_id = $2 AND image_data IS NOT NULL`;
        const item = await db.oneOrNone(query, [itemId, req.session.user.user_id]);

        if (!item) {
            return res.sendStatus(404);
        }

        res.set({
            'Content-Type': item.image_type,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, max-age=86400'
        });
        res.send(item.image_data);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// Inventory: gallery of the logged-in user's clothing items (requires login).
// Optional ?category=tops filters the gallery; unknown categories show everything.
app.get('/inventory', auth, async (req, res) => {
    const category = CATEGORIES.includes(req.query.category) ? req.query.category : null;

    // category filter links, with the current one marked active
    const filters = [{ label: 'All', href: '/inventory', active: !category }].concat(
        CATEGORIES.map(c => ({
            label: optionLabel(c),
            href: `/inventory?category=${c}`,
            active: c === category
        }))
    );

    try {
        // only ever select items that belong to the logged-in user.
        // The photo itself is loaded separately by /inventory/:id/image.
        const query = `SELECT ci.item_id, ci.name, ci.category, ci.style, ci.details, ci.brand, ci.price_paid,
                              (ci.image_data IS NOT NULL) AS has_image,
                              EXTRACT(EPOCH FROM ci.updated_at)::bigint AS version,
                              ARRAY(SELECT color FROM clothing_item_colors cc
                                    WHERE cc.item_id = ci.item_id) AS colors
                       FROM clothing_items ci
                       WHERE ci.user_id = $1 AND ($2 IS NULL OR ci.category = $2)
                       ORDER BY ci.created_at DESC, ci.item_id DESC`;
        const items = await db.any(query, [req.session.user.user_id, category]);

        // color swatches for each card, in the same order as the item form
        items.forEach(item => {
            item.swatches = COLORS.filter(c => item.colors.includes(c.value));
        });

        // the add, edit, and delete routes redirect here with
        // ?added=1, ?updated=1, or ?deleted=1 when they're done
        let message = null;
        if (req.query.added === '1') {
            message = 'Item added to your inventory!';
        } else if (req.query.updated === '1') {
            message = 'Item updated!';
        } else if (req.query.deleted === '1') {
            message = 'Item deleted.';
        }

        res.render('pages/inventory', {
            items,
            filters,
            category,
            message,
            error: false
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/inventory', {
            filters,
            loadError: true,
            message: 'Could not load your inventory, please try again',
            error: true
        });
    }
});

// Saved outfits (requires login). Every query is scoped to the signed-in user.
app.get('/outfits', auth, async (req, res) => {
    try {
        const outfits = await db.any(
            `SELECT o.outfit_id, o.name, COUNT(oi.item_id)::int AS item_count,
                    preview.item_id AS preview_item_id,
                    COALESCE(preview.has_image, false) AS preview_has_image
             FROM outfits o
             LEFT JOIN outfit_items oi ON oi.outfit_id = o.outfit_id AND oi.user_id = o.user_id
             LEFT JOIN LATERAL (
                 SELECT ci.item_id, (ci.image_data IS NOT NULL) AS has_image
                 FROM outfit_items preview_link
                 JOIN clothing_items ci
                   ON ci.item_id = preview_link.item_id AND ci.user_id = preview_link.user_id
                 WHERE preview_link.outfit_id = o.outfit_id AND preview_link.user_id = o.user_id
                 ORDER BY ci.created_at DESC, ci.item_id DESC
                 LIMIT 1
             ) preview ON true
             WHERE o.user_id = $1
             GROUP BY o.outfit_id, preview.item_id, preview.has_image
             ORDER BY o.created_at DESC, o.outfit_id DESC`,
            [req.session.user.user_id]
        );
        const message = req.session.outfitMessage || null;
        delete req.session.outfitMessage;
        res.render('pages/outfits', {
            outfits,
            message,
            error: false
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/outfits', {
            outfits: [],
            loadError: true,
            message: 'Could not load your saved outfits, please try again.',
            error: true
        });
    }
});

app.get('/outfits/new', auth, async (req, res) => {
    try {
        res.render('pages/outfit-form', {
            ...(await outfitFormView(req.session.user.user_id)),
            pageTitle: 'Build an Outfit',
            formAction: '/outfits',
            submitLabel: 'Save Outfit',
            isNew: true
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/outfit-form', {
            pageTitle: 'Build an Outfit',
            formAction: '/outfits',
            submitLabel: 'Save Outfit',
            isNew: true,
            clothing: [],
            message: 'Could not load your clothing inventory, please try again.',
            error: true
        });
    }
});

app.post('/outfits', auth, async (req, res) => {
    const fields = req.body || {};
    const selectedIds = parseOutfitItemIds(fields.item_ids);
    const validationError = validateOutfitFields(fields)
        || (selectedIds === null ? 'Please select valid clothing items.' : null);

    const showError = async (status, message) => {
        try {
            res.status(status).render('pages/outfit-form', {
                ...(await outfitFormView(req.session.user.user_id, fields, selectedIds || [])),
                pageTitle: 'Build an Outfit',
                formAction: '/outfits',
                submitLabel: 'Save Outfit',
                isNew: true,
                message,
                error: true
            });
        } catch (error) {
            console.log(error);
            res.status(500).render('pages/outfit-form', {
                pageTitle: 'Build an Outfit',
                formAction: '/outfits',
                submitLabel: 'Save Outfit',
                isNew: true,
                clothing: [],
                message: 'Could not load your clothing inventory, please try again.',
                error: true
            });
        }
    };

    if (validationError) {
        return showError(400, validationError);
    }

    try {
        const ownedItems = await db.any(
            'SELECT item_id FROM clothing_items WHERE user_id = $1 AND item_id = ANY($2::int[])',
            [req.session.user.user_id, selectedIds]
        );
        if (ownedItems.length !== selectedIds.length) {
            return showError(400, 'You can only add clothing from your own inventory.');
        }

        const name = fields.name.trim();
        await db.tx(async t => {
            const outfit = await t.one(
                `INSERT INTO outfits (user_id, name, description, weather, occasion)
                 VALUES ($1, $2, $3, $4, $5) RETURNING outfit_id`,
                [
                    req.session.user.user_id,
                    name,
                    fields.description?.trim() || null,
                    fields.weather?.trim() || null,
                    fields.occasion?.trim() || null
                ]
            );
            for (const itemId of selectedIds) {
                await t.none(
                    'INSERT INTO outfit_items (outfit_id, item_id, user_id) VALUES ($1, $2, $3)',
                    [outfit.outfit_id, itemId, req.session.user.user_id]
                );
            }
        });
        req.session.outfitMessage = 'Outfit saved!';
        res.redirect('/outfits');
    } catch (error) {
        console.log(error);
        return showError(500, 'Could not save your outfit, please try again.');
    }
});

app.get('/outfits/:id', auth, async (req, res) => {
    const outfitId = parseOutfitId(req.params.id);
    if (!outfitId) {
        return res.sendStatus(404);
    }

    try {
        const outfit = await db.oneOrNone(
            `SELECT outfit_id, name, description, weather, occasion
             FROM outfits WHERE outfit_id = $1 AND user_id = $2`,
            [outfitId, req.session.user.user_id]
        );
        if (!outfit) {
            return res.sendStatus(404);
        }
        const clothing = await db.any(
            `SELECT ci.item_id, ci.name, ci.category,
                    (ci.image_data IS NOT NULL) AS has_image
             FROM outfit_items oi
             JOIN clothing_items ci ON ci.item_id = oi.item_id AND ci.user_id = oi.user_id
             WHERE oi.outfit_id = $1 AND oi.user_id = $2
             ORDER BY ci.created_at DESC, ci.item_id DESC`,
            [outfitId, req.session.user.user_id]
        );
        res.render('pages/outfit-detail', { outfit, clothing });
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/outfit-detail', {
            outfit: null,
            clothing: [],
            message: 'Could not load this outfit, please try again.',
            error: true
        });
    }
});

app.get('/outfits/:id/edit', auth, async (req, res) => {
    const outfitId = parseOutfitId(req.params.id);
    if (!outfitId) {
        return res.sendStatus(404);
    }

    try {
        const outfit = await db.oneOrNone(
            `SELECT outfit_id, name, description, weather, occasion
             FROM outfits WHERE outfit_id = $1 AND user_id = $2`,
            [outfitId, req.session.user.user_id]
        );
        if (!outfit) {
            return res.sendStatus(404);
        }
        const selected = await db.any(
            'SELECT item_id FROM outfit_items WHERE outfit_id = $1 AND user_id = $2',
            [outfitId, req.session.user.user_id]
        );
        res.render('pages/outfit-form', {
            ...(await outfitFormView(
                req.session.user.user_id,
                outfit,
                selected.map(item => item.item_id)
            )),
            pageTitle: 'Edit Outfit',
            formAction: `/outfits/${outfitId}`,
            submitLabel: 'Save Changes',
            isNew: false
        });
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/outfit-form', {
            pageTitle: 'Edit Outfit',
            formAction: `/outfits/${outfitId}`,
            submitLabel: 'Save Changes',
            isNew: false,
            clothing: [],
            message: 'Could not load this outfit, please try again.',
            error: true
        });
    }
});

app.post('/outfits/:id', auth, async (req, res) => {
    const outfitId = parseOutfitId(req.params.id);
    if (!outfitId) {
        return res.sendStatus(404);
    }

    const fields = req.body || {};
    const selectedIds = parseOutfitItemIds(fields.item_ids);
    const validationError = validateOutfitFields(fields)
        || (selectedIds === null ? 'Please select valid clothing items.' : null);
    const showError = async (status, message) => {
        try {
            res.status(status).render('pages/outfit-form', {
                ...(await outfitFormView(req.session.user.user_id, fields, selectedIds || [])),
                outfit_id: outfitId,
                pageTitle: 'Edit Outfit',
                formAction: `/outfits/${outfitId}`,
                submitLabel: 'Save Changes',
                isNew: false,
                message,
                error: true
            });
        } catch (error) {
            console.log(error);
            res.status(500).render('pages/outfit-form', {
                outfit_id: outfitId,
                pageTitle: 'Edit Outfit',
                formAction: `/outfits/${outfitId}`,
                submitLabel: 'Save Changes',
                isNew: false,
                clothing: [],
                message: 'Could not load this outfit, please try again.',
                error: true
            });
        }
    };
    if (validationError) {
        return showError(400, validationError);
    }

    try {
        const ownedItems = await db.any(
            'SELECT item_id FROM clothing_items WHERE user_id = $1 AND item_id = ANY($2::int[])',
            [req.session.user.user_id, selectedIds]
        );
        if (ownedItems.length !== selectedIds.length) {
            return showError(400, 'You can only add clothing from your own inventory.');
        }

        const result = await db.tx(async t => {
            const updated = await t.result(
                `UPDATE outfits SET name = $1, description = $2, weather = $3, occasion = $4
                 WHERE outfit_id = $5 AND user_id = $6`,
                [
                    fields.name.trim(),
                    fields.description?.trim() || null,
                    fields.weather?.trim() || null,
                    fields.occasion?.trim() || null,
                    outfitId,
                    req.session.user.user_id
                ]
            );
            if (updated.rowCount === 0) {
                return false;
            }
            await t.none(
                'DELETE FROM outfit_items WHERE outfit_id = $1 AND user_id = $2',
                [outfitId, req.session.user.user_id]
            );
            for (const itemId of selectedIds) {
                await t.none(
                    'INSERT INTO outfit_items (outfit_id, item_id, user_id) VALUES ($1, $2, $3)',
                    [outfitId, itemId, req.session.user.user_id]
                );
            }
            return true;
        });
        if (!result) {
            return res.sendStatus(404);
        }
        req.session.outfitMessage = 'Outfit saved!';
        res.redirect('/outfits');
    } catch (error) {
        console.log(error);
        return showError(500, 'Could not save your changes, please try again.');
    }
});

app.post('/outfits/:id/delete', auth, async (req, res) => {
    const outfitId = parseOutfitId(req.params.id);
    if (!outfitId) {
        return res.sendStatus(404);
    }

    try {
        const result = await db.result(
            'DELETE FROM outfits WHERE outfit_id = $1 AND user_id = $2',
            [outfitId, req.session.user.user_id]
        );
        if (result.rowCount === 0) {
            return res.sendStatus(404);
        }
        req.session.outfitMessage = 'Outfit deleted.';
        res.redirect('/outfits');
    } catch (error) {
        console.log(error);
        res.status(500).render('pages/outfits', {
            outfits: [],
            loadError: true,
            message: 'Could not delete this outfit, please try again.',
            error: true
        });
    }
});

// Logout: destroy the session so protected pages require a fresh login
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        // res.locals.user was set earlier in this request; clear it so the
        // logged-out page renders the signed-out header (Login / Register)
        res.locals.user = null;
        res.render('pages/logout');
    });
});


// *****************************************************
// Section 5: Start Server
// *****************************************************

// makes Express application available to other javascript files
module.exports = app;