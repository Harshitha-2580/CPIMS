const db = require('./backend/db');

async function fixData() {
  try {
    // Check student_registrations table structure
    const [columns] = await db.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_registrations' AND TABLE_SCHEMA = 'placement_portal2'`
    );
    
    console.log('\n=== student_registrations table structure ===');
    columns.forEach(c => console.log(`- ${c.COLUMN_NAME}: ${c.COLUMN_TYPE}`));
    
    // Check student_registrations for student 3
    const [registrations] = await db.query(
      `SELECT * FROM student_registrations WHERE student_id = 3`
    );
    
    console.log('\n=== Student Registrations for Student 3 ===');
    console.log(registrations);
    
    // Check the latest applications
    const [apps] = await db.query(
      `SELECT a.id, a.student_id, a.opportunity_id, o.title FROM applications a 
       JOIN opportunities o ON a.opportunity_id = o.id WHERE a.student_id = 3`
    );
    
    console.log('\n=== Current Applications for Student 3 ===');
    console.log(apps);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixData();
