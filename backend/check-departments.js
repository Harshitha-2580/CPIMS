const db = require('./db');

async function checkDepartments() {
    try {
        const [depts] = await db.query('SELECT DISTINCT department FROM faculty ORDER BY department');
        
        console.log('\nFaculty Departments Found:');
        depts.forEach(d => console.log(`  - ${d.department}`));
        
        console.log('\nExpected Departments: CSE, ECE, EEE, Civil, Mechanical');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDepartments();
