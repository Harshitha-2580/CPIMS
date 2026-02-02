const db = require('./db');
const bcrypt = require('bcrypt');

async function addStudents() {
    try {
        console.log('Adding student records...\n');

        const students = [
            {
                name: 'Aarav Sharma',
                email: 'aarav.sharma@student.com',
                password: 'password123',
                branch: 'CSE',
                year: '1'
            },
            {
                name: 'Priya Verma',
                email: 'priya.verma@student.com',
                password: 'password123',
                branch: 'CSE',
                year: '2'
            },
            {
                name: 'Rohan Singh',
                email: 'rohan.singh@student.com',
                password: 'password123',
                branch: 'ECE',
                year: '2'
            },
            {
                name: 'Neha Desai',
                email: 'neha.desai@student.com',
                password: 'password123',
                branch: 'EEE',
                year: '3'
            },
            {
                name: 'Arjun Patel',
                email: 'arjun.patel@student.com',
                password: 'password123',
                branch: 'CSE',
                year: '3'
            },
            {
                name: 'Shreya Nair',
                email: 'shreya.nair@student.com',
                password: 'password123',
                branch: 'Civil',
                year: '4'
            },
            {
                name: 'Vikram Gupta',
                email: 'vikram.gupta@student.com',
                password: 'password123',
                branch: 'Mechanical',
                year: '1'
            },
            {
                name: 'Anjali Reddy',
                email: 'anjali.reddy@student.com',
                password: 'password123',
                branch: 'CSE',
                year: '4'
            },
            {
                name: 'Sanjay Kumar',
                email: 'sanjay.kumar@student.com',
                password: 'password123',
                branch: 'ECE',
                year: '1'
            },
            {
                name: 'Divya Menon',
                email: 'divya.menon@student.com',
                password: 'password123',
                branch: 'EEE',
                year: '2'
            },
            {
                name: 'Karan Chopra',
                email: 'karan.chopra@student.com',
                password: 'password123',
                branch: 'Civil',
                year: '2'
            },
            {
                name: 'Sneha Iyer',
                email: 'sneha.iyer@student.com',
                password: 'password123',
                branch: 'Mechanical',
                year: '3'
            }
        ];

        // First, delete existing records to avoid duplicates
        try {
            await db.query('DELETE FROM students');
            console.log('Cleared existing student records\n');
        } catch (err) {
            // Ignore error if table is empty
        }

        for (const student of students) {
            try {
                // Hash the password
                const hashedPassword = await bcrypt.hash(student.password, 10);

                // Insert the student
                await db.query(
                    'INSERT INTO students (name, email, password, branch, year) VALUES (?, ?, ?, ?, ?)',
                    [student.name, student.email, hashedPassword, student.branch, student.year]
                );

                console.log(`✅ Added: ${student.name} - ${student.branch} (Year ${student.year})`);
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️  Already exists: ${student.email}`);
                } else {
                    console.error(`❌ Error adding ${student.name}:`, error.message);
                }
            }
        }

        console.log('\n✅ Student records added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

addStudents();
