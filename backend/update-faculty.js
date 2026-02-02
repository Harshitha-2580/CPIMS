const mysql = require('mysql2/promise');

async function updateFaculty() {
    try {
        const connection = await mysql.createConnection({
            host: 'sql12.freesqldatabase.com',
            user: 'sql12815335',
            password: 'bRqSAsrhGx',
            database: 'sql12815335'
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
