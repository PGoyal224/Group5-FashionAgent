// *****************************************************
// Section 1: Import Dependencies
// *****************************************************

const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const app = express();
const bcrypt = require('bcryptjs');
const session = require('express-session');

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

// PostgreSQL database connection
// Uses environment variables from the Docker Compose configuration

const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
};

const db = pgp(dbConfig);

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

    // check for missing fields
    if (!username || !password || !username.trim() || !password.trim()) {
        return res.render('pages/register', {
            message: 'Please fill out all fields.',
            error: true
        });
    }

    // check length requirements for name and password
    if (username.trim().length > 100) {
        return res.render('pages/register', {
            message: 'Username must be 100 characters or fewer.',
            error: true
        });
    }

    if (password.length < 8){
        return res.render('pages/register', {
            message: 'Password must be at least 8 characters long',
            error: true
        });
    }
    
    if (password !== req.body.confirmPassword){
        return res.render('pages/register', {
            message: 'Passwords do not match',
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


// Logout: destroy the session so protected pages require a fresh login
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('pages/logout');
    });
});


// *****************************************************
// Section 5: Start Server
// *****************************************************

app.listen(3000, () => {
    console.log('Server running on port 3000');
});