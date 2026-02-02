const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function createTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        // Read the SQL file
        const sql = fs.readFileSync('./create_opportunities_table.sql', 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
                console.log('✅ Executed: ' + statement.substring(0, 50) + '...');
            }
        }
        
        console.log('\n✅ All tables created successfully!');
        console.log('\n📋 Created Tables:');
        console.log('1. opportunities - Stores placement drives, internships, hackathons');
        console.log('2. applications - Tracks student applications for opportunities');
        
        const [tables] = await connection.execute("SHOW TABLES LIKE '%opportunit%'");
        console.log('\n📊 Database Tables:', tables);
        
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    } finally {
        await connection.end();
    }
}

createTables();
