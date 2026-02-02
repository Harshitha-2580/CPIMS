require('dotenv').config();
const mysql = require('mysql2/promise');

async function truncateAndAlterTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
            user: process.env.DB_USER || 'sql12815335',
            password: process.env.DB_PASSWORD || 'bRqSAsrhGx',
            database: process.env.DB_NAME || 'sql12815335'
        });

        console.log('⏳ Truncating opportunities table...');
        await connection.query('TRUNCATE TABLE opportunities');
        console.log('✅ Table truncated');

        console.log('\n⏳ Dropping unnecessary columns...');
        const columnsToRemove = [
            'faculty_id', 'opportunity_type', 'title', 'eligibility_criteria',
            'application_deadline', 'location', 'bond', 'allowed_branches',
            'eligible_years', 'max_backlogs', 'gender_pref', 'eligibility',
            'process_details', 'posted_by', 'faculty_name'
        ];

        for (const col of columnsToRemove) {
            try {
                await connection.query(`ALTER TABLE opportunities DROP COLUMN ${col}`);
                console.log(`✅ Dropped ${col}`);
            } catch (err) {
                if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`⏭️  Column ${col} doesn't exist, skipping...`);
                } else {
                    throw err;
                }
            }
        }

        console.log('\n⏳ Adding eligible_branches column if it doesn\'t exist...');
        try {
            await connection.query(`ALTER TABLE opportunities ADD COLUMN eligible_branches VARCHAR(500) AFTER salary_package`);
            console.log('✅ Added eligible_branches column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('⏭️  eligible_branches column already exists');
            } else {
                throw err;
            }
        }

        console.log('\n⏳ Verifying final table structure...');
        const [columns] = await connection.query('DESCRIBE opportunities');
        console.log('\n📋 Final opportunities table structure:');
        console.table(columns);

        console.log('\n✅ Table migration complete!');
        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

truncateAndAlterTable();
