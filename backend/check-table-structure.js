require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
            user: process.env.DB_USER || 'sql12815335',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'sql12815335'
        });

        console.log('📋 Checking opportunities table structure:\n');
        const [columns] = await connection.query('DESCRIBE opportunities');
        console.table(columns);

        console.log('\n📊 Current data in opportunities table:\n');
        const [rows] = await connection.query('SELECT * FROM opportunities');
        console.log('Total rows:', rows.length);
        if (rows.length > 0) {
            console.table(rows.slice(0, 3));
        }

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkTable();
