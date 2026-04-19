const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Second connection pool for NECG campus (placement_portal3)
const pool2 = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME_NEW || 'placement_portal3',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
});

const db2 = pool2.promise();

pool2.getConnection((err, connection) => {
    if (err) {
        console.error('❌ NECG DB (placement_portal3) connection failed: ', err.message);
    } else {
        console.log('✅ Connected to NECG MySQL database (placement_portal3).');
        connection.release();
    }
});

module.exports = db2;
