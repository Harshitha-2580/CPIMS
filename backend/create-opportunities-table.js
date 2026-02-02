const db = require('./db');

async function createTable() {
    try {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS opportunities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('placement', 'internship', 'hackathon') NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                job_role VARCHAR(255) NOT NULL,
                salary_package VARCHAR(100),
                eligible_branches VARCHAR(500),
                min_cgpa DECIMAL(3, 2),
                due_date DATE NOT NULL,
                description TEXT,
                apply_link VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_type (type),
                INDEX idx_company (company_name),
                INDEX idx_due_date (due_date),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        await db.query(createTableSQL);
        console.log('✅ Opportunities table created/verified!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createTable();
