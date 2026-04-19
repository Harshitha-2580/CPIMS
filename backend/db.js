const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// Create a connection pool instead of single connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'placement_portal2',
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
