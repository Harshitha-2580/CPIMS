require('dotenv').config();
const mysql = require('mysql2/promise');

async function recreateTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
            user: process.env.DB_USER || 'sql12815335',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'sql12815335'
        });

        console.log('⏳ Dropping old opportunities table...');
        await connection.query('DROP TABLE IF EXISTS opportunities');
        console.log('✅ Old table dropped');

        console.log('\n⏳ Creating new opportunities table...');
        const createTableSQL = `
            CREATE TABLE opportunities (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await connection.query(createTableSQL);
        console.log('✅ New opportunities table created successfully!');

        console.log('\n📋 Table structure:');
        const [columns] = await connection.query('DESCRIBE opportunities');
        console.table(columns);

        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

recreateTable();
