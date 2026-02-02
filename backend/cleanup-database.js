require('dotenv').config();
const db = require('./db');

async function cleanupDatabase() {
    try {
        console.log('⏳ Dropping applications table...');
        try {
            await db.query('DROP TABLE IF EXISTS applications');
            console.log('✅ Applications table dropped');
        } catch (err) {
            console.log('⏭️  Applications table does not exist or already dropped');
        }

        console.log('\n⏳ Truncating opportunities table...');
        await db.query('TRUNCATE TABLE opportunities');
        console.log('✅ Opportunities table truncated');

        console.log('\n⏳ Removing unnecessary columns...');
        const dropStatements = [
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS faculty_id',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS opportunity_type',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS title',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS eligibility_criteria',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS application_deadline',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS location',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS bond',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS allowed_branches',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS eligible_years',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS max_backlogs',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS gender_pref',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS eligibility',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS process_details',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS posted_by',
            'ALTER TABLE opportunities DROP COLUMN IF EXISTS faculty_name'
        ];

        for (const stmt of dropStatements) {
            try {
                await db.query(stmt);
                const colName = stmt.match(/DROP COLUMN IF EXISTS (\w+)/)[1];
                console.log(`✅ Dropped ${colName}`);
            } catch (err) {
                console.log(`⏭️  Could not drop column`);
            }
        }

        console.log('\n⏳ Ensuring eligible_branches column exists...');
        try {
            await db.query('ALTER TABLE opportunities ADD COLUMN eligible_branches VARCHAR(500)');
            console.log('✅ Added eligible_branches column');
        } catch (err) {
            console.log('⏭️  eligible_branches column already exists');
        }

        console.log('\n📋 Final opportunities table structure:');
        const [columns] = await db.query('DESCRIBE opportunities');
        console.table(columns);

        console.log('\n✅ Database cleanup complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

cleanupDatabase();
