// *****************************************************
// Section 1: Import Dependencies
// *****************************************************

const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const app = express();

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
// Section 3: Routes
// *****************************************************

app.get('/', (req, res) => {
    res.render('pages/home');
});

// *****************************************************
// Section 4: Start Server
// *****************************************************

app.listen(3000, () => {
    console.log('Server running on port 3000');
});