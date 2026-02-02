const db = require('./db');
const bcrypt = require('bcrypt');

// Updated student names organized by the correct departments
const studentNamesByDept = {
    'CSE': [
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
    'ECE': [
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
    ],
    'EEE': [
        'Vikas Malhotra',
        'Ritika Saxena',
        'Nikhil Bhat',
        'Swapna Pillai',
        'Ashish Tiwari',
        'Medha Deshpande',
        'Rahul Nayak',
        'Sakshi Iyer',
        'Akshay Singh',
        'Priyanka Joshi',
        'Shiva Reddy',
        'Ananya Chakraborty',
        'Siddhu Rao',
        'Varun Kapoor',
        'Zainab Khan',
        'Yash Sharma',
        'Xiaomi Li',
        'Waqar Ahmed',
        'Veda Mukherjee',
        'Uma Desai'
    ],
    'Civil': [
        'Ganesh Kumar',
        'Heera Singh',
        'Indu Verma',
        'Jasmine Patel',
        'Keshav Gupta',
        'Laila Nair',
        'Mohan Reddy',
        'Neelam Chopra',
        'Omkar Sharma',
        'Pradeep Iyer',
        'Qasim Khan',
        'Ramesh Rao',
        'Shalini Menon',
        'Tapas Dutta',
        'Uday Verma',
        'Vivek Joshi',
        'Willa Smith',
        'Xavier Lopez',
        'Yamini Rao',
        'Zafar Khan'
    ],
    'Mechanical': [
        'Amar Singh',
        'Bharti Joshi',
        'Chandan Kumar',
        'Dimple Verma',
        'Eshan Patel',
        'Faisal Khan',
        'Gaurav Nair',
        'Hemanth Reddy',
        'Iqbal Ahmed',
        'Jitendar Chopra',
        'Kamal Rao',
        'Lakshmi Sharma',
        'Madhav Iyer',
        'Navneet Menon',
        'Omprakash Dutta',
        'Parth Verma',
        'Qurantul Joshi',
        'Rajesh Smith',
        'Sanjana Lopez',
        'Tanya Rao'
    ]
};

const DEFAULT_PASSWORD = 'student123';

async function updateFacultyDepartmentsAndAddMentees() {
    try {
        console.log('Updating faculty departments and adding mentees...\n');

        // Map of old departments to new departments
        const deptMapping = {
            'Computer Science': 'CSE',
            'Information Technology': 'ECE'
        };

        // Update faculty table with correct departments
        console.log('Updating faculty departments...\n');
        const oldDepts = Object.keys(deptMapping);
        const newDepts = Object.values(deptMapping);

        // Get all faculty and update them
        const [faculty] = await db.query('SELECT id, faculty_id, name, department FROM faculty');

        if (faculty.length === 0) {
            console.log('No faculty found!');
            process.exit(1);
        }

        // Update departments
        for (const fac of faculty) {
            const newDept = deptMapping[fac.department];
            if (newDept) {
                await db.query('UPDATE faculty SET department = ? WHERE id = ?', [newDept, fac.id]);
            }
        }

        console.log('✅ Updated faculty departments\n');

        // Now add the remaining departments' faculty manually
        // Since we only have 20 faculty, let's distribute them better
        const deptList = ['CSE', 'ECE', 'EEE', 'Civil', 'Mechanical'];
        const facultyPerDept = Math.floor(faculty.length / deptList.length);

        console.log(`Reassigning ${faculty.length} faculty across ${deptList.length} departments`);
        console.log(`(~${facultyPerDept} faculty per department)\n`);

        let facultyIdx = 0;
        const facultyByNewDept = {};

        for (const dept of deptList) {
            facultyByNewDept[dept] = [];
            for (let i = 0; i < facultyPerDept && facultyIdx < faculty.length; i++) {
                const fac = faculty[facultyIdx];
                await db.query('UPDATE faculty SET department = ? WHERE id = ?', [dept, fac.id]);
                facultyByNewDept[dept].push(fac);
                facultyIdx++;
            }
        }

        // Assign remaining faculty to EEE, Civil, Mechanical (since we started with only CS and IT)
        const remainingDepts = ['EEE', 'Civil', 'Mechanical'];
        let remainingIdx = 0;
        while (facultyIdx < faculty.length) {
            const dept = remainingDepts[remainingIdx % remainingDepts.length];
            const fac = faculty[facultyIdx];
            await db.query('UPDATE faculty SET department = ? WHERE id = ?', [dept, fac.id]);
            if (!facultyByNewDept[dept]) facultyByNewDept[dept] = [];
            facultyByNewDept[dept].push(fac);
            facultyIdx++;
            remainingIdx++;
        }

        console.log('\nFaculty Distribution:');
        for (const dept of deptList) {
            console.log(`  ${dept}: ${facultyByNewDept[dept] ? facultyByNewDept[dept].length : 0} faculty`);
        }

        // Now add students
        console.log('\n\nAdding students...\n');

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        let totalStudentsAdded = 0;
        let totalMenteesAssigned = 0;

        // Get updated faculty list
        const [updatedFaculty] = await db.query('SELECT id, name, department FROM faculty');
        const updatedFacultyByDept = {};
        updatedFaculty.forEach(fac => {
            if (!updatedFacultyByDept[fac.department]) {
                updatedFacultyByDept[fac.department] = [];
            }
            updatedFacultyByDept[fac.department].push(fac);
        });

        // Add students for each department
        for (const dept of deptList) {
            console.log(`📚 Processing ${dept} Department`);
            console.log('='.repeat(50));

            const deptFaculty = updatedFacultyByDept[dept] || [];
            const deptStudentNames = studentNamesByDept[dept] || [];

            if (deptFaculty.length === 0) {
                console.log(`⚠️  No faculty found for ${dept}`);
                continue;
            }

            if (deptStudentNames.length === 0) {
                console.log(`⚠️  No student names defined for ${dept}`);
                continue;
            }

            const addedStudents = [];

            for (const name of deptStudentNames) {
                const studentEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@final.student.com`;

                try {
                    const [result] = await db.query(
                        'INSERT INTO students (name, email, password, branch, year) VALUES (?, ?, ?, ?, ?)',
                        [name, studentEmail, hashedPassword, dept, '4']
                    );

                    addedStudents.push({
                        id: result.insertId,
                        name: name,
                        email: studentEmail
                    });

                    console.log(`  ✅ Added: ${name} (${studentEmail})`);
                    totalStudentsAdded++;

                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`  ⚠️  Already exists: ${studentEmail}`);
                        try {
                            const [existing] = await db.query('SELECT id FROM students WHERE email = ?', [studentEmail]);
                            if (existing.length > 0) {
                                addedStudents.push({
                                    id: existing[0].id,
                                    name: name,
                                    email: studentEmail
                                });
                            }
                        } catch (e) {
                            // ignore
                        }
                    } else {
                        console.error(`  ❌ Error: ${error.message}`);
                    }
                }
            }

            console.log(`\n  Assigning mentees to ${deptFaculty.length} faculty members...\n`);

            for (let i = 0; i < deptFaculty.length; i++) {
                const fac = deptFaculty[i];
                console.log(`  👨‍🏫 ${fac.name}...`);

                // Get 4 unique students for this faculty
                const menteeCount = 4;
                const startIdx = (i * menteeCount) % addedStudents.length;
                const selectedMentees = [];

                for (let j = 0; j < menteeCount; j++) {
                    const idx = (startIdx + j) % addedStudents.length;
                    selectedMentees.push(addedStudents[idx]);
                }

                for (const student of selectedMentees) {
                    try {
                        await db.query('INSERT INTO mentee_assignments (faculty_id, student_id) VALUES (?, ?)', [fac.id, student.id]);
                        console.log(`     → ${student.name}`);
                        totalMenteesAssigned++;
                    } catch (error) {
                        if (error.code !== 'ER_DUP_ENTRY') {
                            console.error(`     ❌ Error: ${error.message}`);
                        }
                    }
                }
            }

            console.log('');
        }

        console.log('='.repeat(50));
        console.log('✅ MENTEE ASSIGNMENT COMPLETED!\n');
        console.log('Summary:');
        console.log(`  - Total students added: ${totalStudentsAdded}`);
        console.log(`  - Total mentee assignments: ${totalMenteesAssigned}`);
        console.log(`  - Default password: ${DEFAULT_PASSWORD}\n`);

        process.exit(0);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

updateFacultyDepartmentsAndAddMentees();
