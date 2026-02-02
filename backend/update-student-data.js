const db = require('./db');

async function updateStudentData() {
    try {
        console.log('Updating student data with CGPA and placement status...\n');
        
        // Update first mentee (Arjun Verma) - Placed with CGPA 8.5
        await db.query(
            'UPDATE students SET cgpa = ?, placement_status = ? WHERE name = ?',
            [8.5, 'placed', 'Arjun Verma']
        );
        console.log('✓ Updated Arjun Verma (CGPA: 8.5, Status: Placed)');
        
        // Update second mentee (Neha Iyer) - Unplaced with CGPA 7.8
        await db.query(
            'UPDATE students SET cgpa = ?, placement_status = ? WHERE name = ?',
            [7.8, 'unplaced', 'Neha Iyer']
        );
        console.log('✓ Updated Neha Iyer (CGPA: 7.8, Status: Unplaced)');
        
        // Update third mentee (Vikram Sharma) - Placed with CGPA 8.9
        await db.query(
            'UPDATE students SET cgpa = ?, placement_status = ? WHERE name = ?',
            [8.9, 'placed', 'Vikram Sharma']
        );
        console.log('✓ Updated Vikram Sharma (CGPA: 8.9, Status: Placed)');
        
        // Update fourth mentee (Anjali Reddy) - Unplaced with CGPA 7.2
        await db.query(
            'UPDATE students SET cgpa = ?, placement_status = ? WHERE name = ?',
            [7.2, 'unplaced', 'Anjali Reddy']
        );
        console.log('✓ Updated Anjali Reddy (CGPA: 7.2, Status: Unplaced)');
        
        // Update some more students for other faculty members
        const students = [
            { name: 'Ashish Tiwari', cgpa: 8.3, status: 'placed' },
            { name: 'Medha Deshpande', cgpa: 8.7, status: 'placed' },
            { name: 'Rahul Nayak', cgpa: 7.5, status: 'unplaced' },
            { name: 'Sakshi Iyer', cgpa: 8.1, status: 'placed' }
        ];
        
        for (const student of students) {
            await db.query(
                'UPDATE students SET cgpa = ?, placement_status = ? WHERE name = ?',
                [student.cgpa, student.status, student.name]
            );
            console.log(`✓ Updated ${student.name} (CGPA: ${student.cgpa}, Status: ${student.status})`);
        }
        
        console.log('\n✅ All students updated!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateStudentData();
