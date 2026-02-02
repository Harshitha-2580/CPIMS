const db = require('./db');

async function createResumesTable() {
    try {
        console.log('Creating resumes table...\n');
        
        // Create resumes table
        await db.query(`
            CREATE TABLE IF NOT EXISTS resumes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                resume_path VARCHAR(500) NOT NULL,
                version INT DEFAULT 1,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_latest BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                INDEX idx_student_id (student_id),
                INDEX idx_upload_date (upload_date)
            )
        `);
        console.log('✓ Resumes table created');
        
        // Verify the table
        const [columns] = await db.query('DESCRIBE resumes');
        
        console.log('\n✓ Resumes table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createResumesTable();
