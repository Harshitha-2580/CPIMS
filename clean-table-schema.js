const db = require('./backend/db');

async function cleanTableSchema() {
  try {
    console.log('Removing unnecessary fields from tables...\n');
    
    // Drop and recreate assignments_internships
    console.log('Recreating assignments_internships table...');
    await db.query('DROP TABLE IF EXISTS assignments_internships');
    
    await db.query(`
      CREATE TABLE assignments_internships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        job_role VARCHAR(255) NOT NULL,
        internship_type VARCHAR(50),
        stipend VARCHAR(100),
        duration VARCHAR(100),
        due_date DATE NOT NULL,
        description TEXT,
        apply_link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id)
      )
    `);
    console.log('✅ assignments_internships created');
    
    // Recreate assignments_drives
    console.log('Recreating assignments_drives table...');
    await db.query('DROP TABLE IF EXISTS assignments_drives');
    
    await db.query(`
      CREATE TABLE assignments_drives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        job_role VARCHAR(255) NOT NULL,
        salary_package VARCHAR(100) NOT NULL,
        due_date DATE NOT NULL,
        description TEXT,
        apply_link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id)
      )
    `);
    console.log('✅ assignments_drives created');
    
    // Verify schema
    console.log('\n--- INTERNSHIPS TABLE SCHEMA ---');
    const [internships] = await db.query('DESCRIBE assignments_internships');
    internships.forEach(col => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n--- PLACEMENT DRIVES TABLE SCHEMA ---');
    const [placements] = await db.query('DESCRIBE assignments_drives');
    placements.forEach(col => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n✅ All tables cleaned and updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanTableSchema();
