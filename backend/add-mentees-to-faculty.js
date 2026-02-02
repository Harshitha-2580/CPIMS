const db = require('./db');
const bcrypt = require('bcrypt');

// Sample student names organized by department
const studentNamesByDept = {
    'Computer Science': [
        'Arjun Verma',
        'Priya Singh',
        'Rohan Gupta',
        'Neha Iyer',
        'Vikram Sharma',
        'Anjali Reddy',
        'Sanjay Patel',
        'Divya Nair',
        'Karan Chopra',
        'Sneha Desai',
        'Aditya Kumar',
        'Pooja Menon',
        'Harshit Rao',
        'Richa Sharma',
        'Aman Singh',
        'Zara Khan',
        'Nikhil Joshi',
        'Riya Pillai',
        'Sameer Gupta',
        'Isha Verma'
    ],
    'Information Technology': [
        'Bhavesh Patel',
        'Cindrella Singh',
        'Dhanraj Kumar',
        'Esha Verma',
        'Farhan Khan',
        'Giselle Sharma',
        'Harsh Reddy',
        'Ishita Iyer',
        'Jatin Chopra',
        'Kavya Desai',
        'Lakshay Nair',
        'Mira Menon',
        'Naveen Rao',
        'Olivia Sharma',
        'Pranav Singh',
        'Quentin Gupta',
        'Radhika Khan',
        'Siddharth Patel',
        'Tanvi Verma',
        'Uday Joshi'
    ]
};

const DEFAULT_PASSWORD = 'student123';

async function addMenteesToFaculty() {
    try {
        console.log('Starting mentee assignment process...\n');

        // Get all faculty members
        const [faculty] = await db.query('SELECT id, faculty_id, name, department FROM faculty');
        
        if (faculty.length === 0) {
            console.log('No faculty found in database');
            process.exit(1);
        }

        console.log(`Found ${faculty.length} faculty members\n`);

        // Hash the default password once
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Group faculty by department
        const facultyByDept = {};
        faculty.forEach(fac => {
            if (!facultyByDept[fac.department]) {
                facultyByDept[fac.department] = [];
            }
            facultyByDept[fac.department].push(fac);
        });

        let totalStudentsAdded = 0;
        let totalMenteesAssigned = 0;

        // For each department
        for (const [dept, deptFaculty] of Object.entries(facultyByDept)) {
            console.log(`\n📚 Processing ${dept} Department`);
            console.log('='.repeat(50));
            
            const deptStudentNames = studentNamesByDept[dept] || [];
            
            if (deptStudentNames.length === 0) {
                console.log(`⚠️  No student names defined for ${dept}`);
                continue;
            }

            // Add students for this department
            const addedStudents = [];
            
            for (let i = 0; i < deptStudentNames.length; i++) {
                const name = deptStudentNames[i];
                const studentEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@final.student.com`;
                
                try {
                    // Insert student
                    const [result] = await db.query(
                        'INSERT INTO students (name, email, password, branch, year) VALUES (?, ?, ?, ?, ?)',
                        [name, studentEmail, hashedPassword, dept, '4']
                    );
                    
                    addedStudents.push({
                        id: result.insertId,
                        name: name,
                        email: studentEmail
                    });
                    
                    console.log(`  ✅ Added student: ${name} (${studentEmail})`);
                    totalStudentsAdded++;
                    
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`  ⚠️  Student already exists: ${studentEmail}`);
                        // Try to get existing student ID
                        try {
                            const [existing] = await db.query(
                                'SELECT id FROM students WHERE email = ?',
                                [studentEmail]
                            );
                            if (existing.length > 0) {
                                addedStudents.push({
                                    id: existing[0].id,
                                    name: name,
                                    email: studentEmail
                                });
                            }
                        } catch (e) {
                            // Ignore
                        }
                    } else {
                        console.error(`  ❌ Error adding ${name}:`, error.message);
                    }
                }
            }

            console.log(`\n  Added ${addedStudents.length} students in ${dept}\n`);

            // Assign 4 students to each faculty in this department
            for (const fac of deptFaculty) {
                console.log(`  👨‍🏫 Assigning mentees to ${fac.name}...`);
                
                // Pick 4 different students for this faculty
                const menteeCount = Math.min(4, addedStudents.length);
                const selectedMentees = addedStudents.slice(
                    (deptFaculty.indexOf(fac) * menteeCount) % addedStudents.length,
                    (deptFaculty.indexOf(fac) * menteeCount) % addedStudents.length + menteeCount
                );

                // Handle wrap-around if not enough unique students
                while (selectedMentees.length < 4 && addedStudents.length > 0) {
                    const nextIdx = (selectedMentees.length + deptFaculty.indexOf(fac) * 4) % addedStudents.length;
                    const student = addedStudents[nextIdx];
                    if (!selectedMentees.find(m => m.id === student.id)) {
                        selectedMentees.push(student);
                    } else {
                        break;
                    }
                }

                for (const student of selectedMentees) {
                    try {
                        // Use mentee_assignments table instead of mentorships
                        await db.query(
                            'INSERT INTO mentee_assignments (faculty_id, student_id) VALUES (?, ?)',
                            [fac.id, student.id]
                        );
                        
                        console.log(`     → Assigned ${student.name} as mentee`);
                        totalMenteesAssigned++;
                        
                    } catch (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            console.log(`     ⚠️  Assignment already exists for ${student.name}`);
                        } else {
                            console.error(`     ❌ Error assigning ${student.name}:`, error.message);
                        }
                    }
                }
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log('✅ MENTEE ASSIGNMENT COMPLETED!');
        console.log(`\nSummary:`);
        console.log(`  - Total students added: ${totalStudentsAdded}`);
        console.log(`  - Total mentee assignments: ${totalMenteesAssigned}`);
        console.log(`  - Default password for all students: ${DEFAULT_PASSWORD}\n`);

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the function
addMenteesToFaculty();
