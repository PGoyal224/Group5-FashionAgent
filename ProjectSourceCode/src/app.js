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
    detectImageType,
    parsePrice,
    toList,
    MAX_IMAGE_BYTES
} = require('./validateClothingItem');
const { CATEGORIES, COLORS, STYLES, optionLabel } = require('./clothingOptions');

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

// everything the add item form needs; fields holds what the user entered, if anything
const addItemForm = (fields = {}) => ({
    name: fields.name,
    brand: fields.brand,
    price_paid: fields.price_paid,
    categories: selectOptions(CATEGORIES, fields.category),
    styles: selectOptions(STYLES, fields.style),
    colors: colorOptions(toList(fields.colors))
});

// Photo uploads: keep the file in memory so it can be checked and then
// saved to the clothing_items table. Rejects anything over 5 MB.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 }
});

// Add clothing item form (requires login)
app.get('/inventory/add', auth, (req, res) => {
    res.render('pages/add-item', addItemForm());
});

// Add clothing item: save the details and uploaded photo, then go back to the gallery
app.post('/inventory/add', auth, (req, res) => {
    // run the upload here (not as route middleware) so upload errors,
    // like a file that's too big, can be shown on the form
    upload.single('image')(req, res, async (uploadError) => {
        const fields = req.body || {};
        const { name, category, style, brand, price_paid } = fields;

        // re-show the form with the user's entries still filled in
        const showError = (status, message) => res.status(status).render('pages/add-item', {
            ...addItemForm(fields),
            message,
            error: true
        });

        if (uploadError) {
            if (uploadError.code === 'LIMIT_FILE_SIZE') {
                return showError(400, 'Photo must be 5 MB or smaller.');
            }
            console.log(uploadError);
            return showError(400, 'Could not read the upload, please try again.');
        }

        const validationError = validateClothingItem(fields, req.file);
        if (validationError) {
            return showError(400, validationError);
        }

        // optional text fields are saved as NULL when left blank
        const optional = value => (value && value.trim() ? value.trim() : null);

        try {
            // save the item and its colors together: if either fails, neither is saved
            await db.tx(async t => {
                const itemQuery = `INSERT INTO clothing_items
                                       (user_id, name, category, style, brand, price_paid, image_data, image_type)
                                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                   RETURNING item_id`;
                const item = await t.one(itemQuery, [
                    req.session.user.user_id,
                    name.trim(),
                    category,
                    style || null,
                    optional(brand),
                    parsePrice(price_paid),
                    req.file.buffer,
                    detectImageType(req.file.buffer)
                ]);

                // one row per color
                for (const color of toList(fields.colors)) {
                    await t.none(
                        'INSERT INTO clothing_item_colors (item_id, color) VALUES ($1, $2)',
                        [item.item_id, color]
                    );
                }
            });

            res.redirect('/inventory?added=1');
        } catch (error) {
            console.log(error);
            showError(500, 'Something went wrong, please try again');
        }
    });
});

// Clothing item photo (requires login). Only the item's owner can see it;
// everyone else gets a 404 so they can't tell which item ids exist.
app.get('/inventory/:id/image', auth, async (req, res) => {
    // item_id is a PostgreSQL INT, so anything else can't match
    const itemId = /^\d{1,10}$/.test(req.params.id) ? Number(req.params.id) : 0;
    if (itemId < 1 || itemId > 2147483647) {
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
        const query = `SELECT ci.item_id, ci.name, ci.category, ci.style, ci.brand, ci.price_paid,
                              (ci.image_data IS NOT NULL) AS has_image,
                              ARRAY(SELECT color FROM clothing_item_colors cc
                                    WHERE cc.item_id = ci.item_id) AS colors
                       FROM clothing_items ci
                       WHERE ci.user_id = $1 AND ($2 IS NULL OR ci.category = $2)
                       ORDER BY ci.created_at DESC, ci.item_id DESC`;
        const items = await db.any(query, [req.session.user.user_id, category]);

        // color swatches for each card, in the same order as the add item form
        items.forEach(item => {
            item.swatches = COLORS.filter(c => item.colors.includes(c.value));
        });

        // /inventory/add redirects here with ?added=1 after saving an item
        const added = req.query.added === '1';

        res.render('pages/inventory', {
            items,
            filters,
            category,
            message: added ? 'Item added to your inventory!' : null,
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


// Logout: destroy the session so protected pages require a fresh login
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('pages/logout');
    });
});


// *****************************************************
// Section 5: Start Server
// *****************************************************

// makes Express application available to other javascript files
module.exports = app;