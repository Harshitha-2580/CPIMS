require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
            user: process.env.DB_USER || 'sql12815335',
            password: process.env.DB_PASSWORD || 'bRqSAsrhGx',
            database: process.env.DB_NAME || 'sql12815335'
        });

        console.log('🔍 Checking table existence...\n');

        // Check if opportunities table exists
        const [opportunities] = await connection.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='opportunities'"
        );
        
        if (opportunities.length === 0) {
            console.log('⏳ Creating opportunities table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS opportunities (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    type ENUM('placement','internship','hackathon','competition') NOT NULL DEFAULT 'internship',
                    company_name VARCHAR(255) DEFAULT NULL,
                    salary_package DECIMAL(5,2) DEFAULT NULL,     
                    eligibility VARCHAR(255) DEFAULT NULL,
                    process_details TEXT DEFAULT NULL,
                    due_date DATE DEFAULT NULL,
                    posted_by ENUM('admin','faculty') NOT NULL DEFAULT 'faculty',
                    faculty_id INT DEFAULT NULL,
                    faculty_name VARCHAR(255) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
                )
            `);
            console.log('✅ Opportunities table created\n');
        } else {
            console.log('✅ Opportunities table already exists\n');
        }

        // Check if mentee_assignments table exists
        const [menteeAssignments] = await connection.query(
            "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mentee_assignments'"
        );
        
        if (menteeAssignments.length === 0) {
            console.log('⏳ Creating mentee_assignments table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS mentee_assignments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    faculty_id INT NOT NULL,
                    student_id INT NOT NULL,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ Mentee assignments table created\n');
        } else {
            console.log('✅ Mentee assignments table already exists\n');
        }

        console.log('📋 Tables check completed!\n');
        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createTables();
