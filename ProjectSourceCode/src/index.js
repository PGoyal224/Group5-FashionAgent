// *****************************************************
// Section 1: Import Dependencies
// *****************************************************

const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const app = express();
const bcrypt = require('bcryptjs');

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


// *****************************************************
// Section 4: Routes
// *****************************************************

app.get('/', (req, res) => {
    res.render('pages/home');
});

// Register GET route
app.get('/register', (req, res) => {
    res.render('pages/register');
});

// Register POST route
app.post('/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // check for missing fields
    if (!username || !password || !username.trim() || !password.trim()) {
        return res.redner('pages/register', {
            message: 'Please fill out all fields.',
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


// *****************************************************
// Section 5: Start Server
// *****************************************************

app.listen(3000, () => {
    console.log('Server running on port 3000');
});