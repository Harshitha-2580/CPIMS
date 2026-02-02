const db = require('./backend/db');

async function restructureTables() {
  try {
    console.log('Restructuring assignments tables...');
    
    // Drop existing assignments table if it exists
    await db.query('DROP TABLE IF EXISTS assignments');
    console.log('✅ Dropped old assignments table');
    
    // Create assignments_internships table (without foreign key for now)
    await db.query(`
      CREATE TABLE assignments_internships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        internship_type VARCHAR(50) DEFAULT 'unpaid',
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
    console.log('✅ Created assignments_internships table');
    
    // Create assignments_drives table (without foreign key for now)
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
    console.log('✅ Created assignments_drives table');
    
    console.log('\n✅ All tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restructureTables();
