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

async function addQualificationColumn() {
    const connection = await pool.getConnection();
    
    try {
        console.log('Adding qualification column to faculty table...');
        
        // Add qualification column after designation
        await connection.execute(`
            ALTER TABLE faculty 
            ADD COLUMN qualification VARCHAR(100) AFTER designation
        `);
        console.log('✅ Qualification column added successfully');

        // Sample qualifications to distribute among faculty
        const qualifications = [
            'PhD in Electronics Engineering',
            'M.Tech in Computer Science',
            'PhD in Mechanical Engineering',
            'M.Tech in Electrical Engineering',
            'PhD in Civil Engineering',
            'M.Tech in Information Technology',
            'PhD in Computer Science',
            'M.Tech in Electronics Engineering',
            'PhD in Electrical Engineering',
            'M.Tech in Civil Engineering',
            'PhD in Mechanical Engineering',
            'M.Tech in Mechanical Engineering',
            'PhD in Information Technology',
            'M.Tech in Electronics Engineering',
            'PhD in Chemical Engineering',
            'M.Tech in Electrical Engineering',
            'PhD in Civil Engineering',
            'M.Tech in Computer Science',
            'PhD in Electronics Engineering',
            'M.Tech in Information Technology'
        ];

        // Update faculty with qualifications
        console.log('Adding sample qualification data...');
        
        for (let i = 0; i < qualifications.length; i++) {
            await connection.execute(
                `UPDATE faculty SET qualification = ? WHERE id = ?`,
                [qualifications[i], i + 1]
            );
        }

        console.log('✅ Added qualifications to all faculty members');

        // Display updated faculty data
        const [results] = await connection.execute(
            `SELECT id, name, designation, qualification FROM faculty LIMIT 20`
        );
        
        console.log('\n✅ Updated Faculty Data:');
        console.table(results);

        console.log('\n✅ All done! Qualification column added with sample data for all 20 faculty members.');

    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Qualification column already exists');
            
            // Just update the data if column exists
            const qualifications = [
                'PhD in Electronics Engineering',
                'M.Tech in Computer Science',
                'PhD in Mechanical Engineering',
                'M.Tech in Electrical Engineering',
                'PhD in Civil Engineering',
                'M.Tech in Information Technology',
                'PhD in Computer Science',
                'M.Tech in Electronics Engineering',
                'PhD in Electrical Engineering',
                'M.Tech in Civil Engineering',
                'PhD in Mechanical Engineering',
                'M.Tech in Mechanical Engineering',
                'PhD in Information Technology',
                'M.Tech in Electronics Engineering',
                'PhD in Chemical Engineering',
                'M.Tech in Electrical Engineering',
                'PhD in Civil Engineering',
                'M.Tech in Computer Science',
                'PhD in Electronics Engineering',
                'M.Tech in Information Technology'
            ];

            console.log('Updating faculty with qualifications...');
            
            for (let i = 0; i < qualifications.length; i++) {
                await connection.execute(
                    `UPDATE faculty SET qualification = ? WHERE id = ?`,
                    [qualifications[i], i + 1]
                );
            }

            const [results] = await connection.execute(
                `SELECT id, name, designation, qualification FROM faculty LIMIT 20`
            );
            
            console.log('\n✅ Updated Faculty Data:');
            console.table(results);
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        await connection.release();
        await pool.end();
    }
}

addQualificationColumn();
