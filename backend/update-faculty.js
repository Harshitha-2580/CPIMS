require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateFaculty() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
            user: process.env.DB_USER || 'sql12815335',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'sql12815335'
        });

        console.log('Connected to database');

        // Update NECN_FAC_010 with correct name
        await connection.query(
            'UPDATE faculty SET name=? WHERE faculty_id=?',
            ['Dr. Sneha Desai', 'NECN_FAC_010']
        );

        console.log('✓ Updated NECN_FAC_010 to Dr. Sneha Desai');
        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

updateFaculty();
