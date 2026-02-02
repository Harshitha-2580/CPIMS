const db = require('./db');

async function checkStudent() {
    try {
        const [rows] = await db.query('SELECT id, name, email, branch, year, password FROM students WHERE id = 18');
        
        if (rows.length > 0) {
            console.log('\n✅ Student found:');
            console.log('ID:', rows[0].id);
            console.log('Name:', rows[0].name);
            console.log('Email:', rows[0].email);
            console.log('Branch:', rows[0].branch);
            console.log('Year:', rows[0].year);
            console.log('Hashed Password:', rows[0].password);
            console.log('\n⚠️ Note: Password is hashed with bcrypt for security.');
            console.log('The plain text password cannot be retrieved from the hash.');
        } else {
            console.log('❌ No student found with id 18');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkStudent();
