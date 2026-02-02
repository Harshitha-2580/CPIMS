const db = require('./db');

async function dropResumesTable() {
    try {
        console.log('Dropping resumes table...\n');
        
        await db.query('DROP TABLE IF EXISTS resumes');
        
        console.log('✅ Done! Resumes table has been deleted.\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

dropResumesTable();
