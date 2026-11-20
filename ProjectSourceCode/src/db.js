const pgp = require('pg-promise')();

const dbConfig = {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'db',
    port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
};

const db = pgp(dbConfig);

module.exports = db;