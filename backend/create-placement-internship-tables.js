require('dotenv').config();
const db = require('./db');

async function createTables() {
    try {
        console.log('⏳ Dropping old opportunities table...');
        await db.query('DROP TABLE IF EXISTS opportunities');
        console.log('✅ Old table dropped');

        console.log('\n⏳ Creating placements table...');
        const placementsSQL = `
            CREATE TABLE placements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                job_role VARCHAR(255) NOT NULL,
                salary_package VARCHAR(100) NOT NULL,
                eligible_branches VARCHAR(500) NOT NULL,
                min_cgpa DECIMAL(3, 2),
                due_date DATE NOT NULL,
                description TEXT,
                apply_link VARCHAR(500) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_company (company_name),
                INDEX idx_due_date (due_date),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await db.query(placementsSQL);
        console.log('✅ Placements table created');

        console.log('\n⏳ Creating internships table...');
        const internshipsSQL = `
            CREATE TABLE internships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                internship_type ENUM('paid', 'unpaid') NOT NULL,
                stipend VARCHAR(100),
                duration VARCHAR(100) NOT NULL,
                eligible_branches VARCHAR(500) NOT NULL,
                min_cgpa DECIMAL(3, 2),
                due_date DATE NOT NULL,
                description TEXT,
                apply_link VARCHAR(500) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_company (company_name),
                INDEX idx_type (internship_type),
                INDEX idx_due_date (due_date),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await db.query(internshipsSQL);
        console.log('✅ Internships table created');

        console.log('\n📋 Placements table structure:');
        const [placementsCols] = await db.query('DESCRIBE placements');
        console.table(placementsCols);

        console.log('\n📋 Internships table structure:');
        const [internshipsCols] = await db.query('DESCRIBE internships');
        console.table(internshipsCols);

        console.log('\n✅ All tables created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createTables();
