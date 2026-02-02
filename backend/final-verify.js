const db = require('./db');

async function verifyData() {
    try {
        console.log('\n=== FINAL VERIFICATION ===\n');

        const [depts] = await db.query('SELECT department, COUNT(DISTINCT id) as faculty_count FROM faculty GROUP BY department ORDER BY department');
        console.log('Faculty by Department:');
        depts.forEach(d => console.log(`  ${d.department}: ${d.faculty_count} faculty`));

        const [students] = await db.query('SELECT branch, COUNT(*) as count FROM students WHERE year = 4 GROUP BY branch ORDER BY branch');
        console.log('\nStudents by Department (Final Year):');
        students.forEach(s => console.log(`  ${s.branch}: ${s.count} students`));

        const [total] = await db.query('SELECT COUNT(*) as total FROM mentee_assignments');
        console.log(`\nTotal Mentee Assignments: ${total[0].total}`);

        const [sample] = await db.query(`
            SELECT f.name, f.department, COUNT(*) as mentee_count 
            FROM mentee_assignments ma 
            JOIN faculty f ON ma.faculty_id = f.id 
            GROUP BY f.id, f.name, f.department
            LIMIT 10
        `);
        
        console.log('\nSample Faculty with Mentee Count:');
        sample.forEach(row => console.log(`  ${row.name} (${row.department}): ${row.mentee_count} mentees`));

        console.log('\n✅ VERIFICATION COMPLETE\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyData();
