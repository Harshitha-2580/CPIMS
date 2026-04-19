const db = require('./backend/db');

async function checkApplications() {
  try {
    // Check all applications for student 3
    const [apps] = await db.query(
      `SELECT a.id, a.student_id, a.opportunity_id, o.title, o.company_name, o.due_date, o.type
       FROM applications a 
       JOIN opportunities o ON a.opportunity_id = o.id 
       WHERE a.student_id = 3`
    );
    
    console.log('\n=== Applications for Student 3 (from opportunities) ===');
    console.log(apps);
    
    // Check all opportunities with type = placement
    const [opps] = await db.query(
      `SELECT id, title, company_name, due_date, type, status FROM opportunities WHERE type = 'placement'`
    );
    
    console.log('\n=== All Placement Opportunities ===');
    console.log(opps);
    
    // Check placements table (might have TCS)
    const [placements] = await db.query(
      `SELECT id, company_name, job_role, due_date, event_date, is_active FROM placements LIMIT 5`
    );
    
    console.log('\n=== All Placements (sample) ===');
    console.log(placements);
    
    // Check for duplicate applications
    const [dupes] = await db.query(
      `SELECT opportunity_id, COUNT(*) as count FROM applications WHERE student_id = 3 GROUP BY opportunity_id HAVING count > 1`
    );
    
    console.log('\n=== Duplicate Applications ===');
    console.log(dupes);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkApplications();
