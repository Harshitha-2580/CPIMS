const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool instead of single connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
    user: process.env.DB_USER || 'sql12815335',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'sql12815335',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
});

// Wrap pool for promises
const db = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed: ', err.message);
    } else {
        console.log('✅ Connected to MySQL database.');
        connection.release();
    }
});

module.exports = db;
