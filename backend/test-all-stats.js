require('dotenv').config();
const db = require('./db');

async function testDashboardStats() {
    try {
        // Test each stat individually
        console.log('=== Testing Dashboard Stats Query ===\n');
        
        const [[{ total_students }]] = await db.query(`SELECT COUNT(*) as total_students FROM students`);
        console.log('Total Students:', total_students);
        
        const [[{ total_placements }]] = await db.query(`SELECT COUNT(*) as total_placements FROM placement_participation`);
        console.log('Total Placements:', total_placements);
        
        const [[{ upcoming_drives }]] = await db.query(`
            SELECT COUNT(*) as upcoming_drives
            FROM opportunities
            WHERE type = 'placement' AND status = 'active'
        `);
        console.log('Upcoming Drives:', upcoming_drives);
        
        // Show actual records
        console.log('\n=== Actual Records ===');
        
        const [students] = await db.query(`SELECT COUNT(*) as count FROM students`);
        console.log('Students in DB:', students[0].count);
        
        const [opportunities] = await db.query(`
            SELECT id, company_name, type, status, due_date 
            FROM opportunities 
            ORDER BY id DESC
        `);
        console.log('\nAll Opportunities:');
        opportunities.forEach(opp => {
            console.log(`  ID: ${opp.id}, Type: ${opp.type}, Status: ${opp.status}, DueDate: ${opp.due_date}`);
        });
        
        const [placements] = await db.query(`
            SELECT * 
            FROM placement_participation
        `);
        console.log('\nPlacementParticipation Records:', placements.length);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testDashboardStats();
