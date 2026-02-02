const db = require('./backend/db');

async function fixTableSchema() {
  try {
    console.log('Fixing table schema to match form fields...\n');
    
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
        eligible_branches VARCHAR(255) DEFAULT 'All',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id)
      )
    `);
    console.log('✅ assignments_internships created with correct schema');
    
    // Verify assignments_drives structure
    console.log('\nRecreating assignments_drives table...');
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
        eligible_branches VARCHAR(255) DEFAULT 'All',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id)
      )
    `);
    console.log('✅ assignments_drives created with correct schema');
    
    // Verify schema by describing tables
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
    
    console.log('\n✅ All tables updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixTableSchema();
