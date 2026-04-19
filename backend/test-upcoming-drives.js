require('dotenv').config();
const db = require('./db');

async function testUpcomingDrives() {
    try {
        // Check all active placement drives
        const [drives] = await db.query(`
            SELECT id, company_name, due_date, type, status 
            FROM opportunities 
            WHERE type = 'placement' AND status = 'active'
        `);
        
        console.log('Active placement drives:');
        console.log(drives);
        
        // Check the count
        const [[{ count }]] = await db.query(`
            SELECT COUNT(*) as count 
            FROM opportunities 
            WHERE type = 'placement' AND status = 'active'
        `);
        
        console.log('\nTotal count of active placement drives:', count);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testUpcomingDrives();
