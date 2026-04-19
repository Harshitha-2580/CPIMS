const db = require('./backend/db');
const db2 = require('./backend/db2');

async function checkPlacementStatus() {
  try {
    console.log('\n========== NECN Database ==========');
    
    // Check students table structure and data
    const [students] = await db.query(`
      SELECT placement_status, COUNT(*) as count 
      FROM students 
      GROUP BY placement_status
    `);
    console.log('Students by placement_status:');
    console.log(students);

    // Check student_registrations with selected status
    const [selected] = await db.query(`
      SELECT COUNT(DISTINCT student_id) as selected_count
      FROM student_registrations
      WHERE status = 'selected'
    `);
    console.log('\nStudents with "selected" status in student_registrations:');
    console.log(selected);

    // Check if there's any placement data
    const [placements] = await db.query(`
      SELECT COUNT(*) as total_placements FROM placements
    `);
    console.log('\nTotal placements:');
    console.log(placements);

    // Check student_registrations table
    const [registrations] = await db.query(`
      SELECT COUNT(*) as total_registrations 
      FROM student_registrations
    `);
    console.log('\nTotal registrations:');
    console.log(registrations);

    console.log('\n========== NECG Database ==========');
    
    // Check NECG students
    const [students2] = await db2.query(`
      SELECT placement_status, COUNT(*) as count 
      FROM students 
      GROUP BY placement_status
    `);
    console.log('Students by placement_status (NECG):');
    console.log(students2);

    // Check NECG selected registrations
    const [selected2] = await db2.query(`
      SELECT COUNT(DISTINCT student_id) as selected_count
      FROM student_registrations
      WHERE status = 'selected'
    `);
    console.log('\nStudents with "selected" status in student_registrations (NECG):');
    console.log(selected2);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkPlacementStatus();
