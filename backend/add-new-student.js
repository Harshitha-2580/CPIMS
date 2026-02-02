const db = require('./db');
const bcrypt = require('bcrypt');

async function addStudent() {
    try {
        const password = 'student123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Adding new student...\n');
        
        const [result] = await db.query(
            'INSERT INTO students (name, email, password, branch, year, cgpa, placement_status, gender, roll_no, backlogs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['Priya Sharma', 'priya.sharma@student.com', hashedPassword, 'CSE', '3', 8.2, 'unplaced', 'F', 'NEC23CSE018', 0]
        );
        
        console.log('✅ Student added successfully!\n');
        console.log('Student Details:');
        console.log('ID:', result.insertId);
        console.log('Name: Priya Sharma');
        console.log('Email: priya.sharma@student.com');
        console.log('Password: student123');
        console.log('Roll No: NEC23CSE018');
        console.log('Branch: CSE');
        console.log('Year: 3');
        console.log('CGPA: 8.2');
        console.log('Placement Status: Unplaced');
        console.log('Gender: Female');
        console.log('Backlogs: 0');
        
        // Verify the student was added
        const [rows] = await db.query('SELECT id, name, email, branch, year FROM students WHERE id = ?', [result.insertId]);
        if (rows.length > 0) {
            console.log('\n✅ Verification: Student record confirmed in database');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

addStudent();
