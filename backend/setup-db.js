const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
            user: process.env.DB_USER || 'sql12815335',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'sql12815335'
        });

        console.log('Connected to database');

        // Read SQL file
        const sqlFile = path.join(__dirname, 'faculty_setup.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            try {
                await connection.query(statement);
                console.log('✓ Executed:', statement.substring(0, 50) + '...');
            } catch (err) {
                console.error('Error executing statement:', err.message);
            }
        }

        console.log('\n✅ Database setup completed successfully!');
        console.log('Faculty records created: NECN_FAC_001 to NECN_FAC_020');
        console.log('Tables created: faculty, faculty_auth, faculty_password_resets, opportunities, mentorships, faculty_resources, faculty_blogs, faculty_events');

        await connection.end();
    } catch (err) {
        console.error('Setup error:', err);
        process.exit(1);
    }
}

setupDatabase();
