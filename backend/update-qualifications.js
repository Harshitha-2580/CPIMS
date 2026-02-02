const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function updateQualifications() {
    const connection = await pool.getConnection();
    
    try {
        console.log('Updating qualifications...');
        
        // Update PhD entries
        await connection.execute(
            `UPDATE faculty SET qualification = 'PhD' WHERE qualification LIKE 'PhD%'`
        );
        console.log('✅ Updated PhD entries');

        // Update M.Tech entries
        await connection.execute(
            `UPDATE faculty SET qualification = 'M.Tech' WHERE qualification LIKE 'M.Tech%'`
        );
        console.log('✅ Updated M.Tech entries');

        // Display updated data
        const [results] = await connection.execute(
            `SELECT id, name, designation, qualification FROM faculty LIMIT 20`
        );
        
        console.log('\n✅ Updated Faculty Data:');
        console.table(results);

        console.log('\n✅ All qualifications updated successfully!');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.release();
        await pool.end();
    }
}

updateQualifications();
