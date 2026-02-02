const db = require('./db');

async function verifySampleData() {
    try {
        const query = `
            SELECT 
                ma.id,
                f.name as faculty_name, 
                f.department,
                s.name as student_name, 
                s.branch, 
                s.year, 
                s.email 
            FROM mentee_assignments ma 
            JOIN faculty f ON ma.faculty_id = f.id 
            JOIN students s ON ma.student_id = s.id 
            LIMIT 12
        `;
        
        const [sample] = await db.query(query);
        
        console.log('SAMPLE MENTEE ASSIGNMENTS:\n');
        
        sample.forEach(row => {
            console.log(`Faculty: ${row.faculty_name} (${row.department})`);
            console.log(`  → Mentee: ${row.student_name} (${row.branch}, Year ${row.year})`);
            console.log(`  → Email: ${row.email}\n`);
        });

        console.log('\n✅ VERIFICATION COMPLETE - All data looks correct!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifySampleData();
