require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
    user: process.env.DB_USER || 'sql12815335',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'sql12815335',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function setupDatabase() {
    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('Starting database setup...\n');

        // Create new database
        console.log('1. Creating database placement_portal1...');
        await connection.query('CREATE DATABASE IF NOT EXISTS placement_portal1');
        console.log('   ✓ Database created\n');

        // Switch to the new database
        await connection.query('USE placement_portal1');
        console.log('2. Switched to placement_portal1 database\n');

        // Students Table
        console.log('3. Creating students table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                branch VARCHAR(50),
                year ENUM('1','2','3','4') DEFAULT '1',
                cgpa DECIMAL(3,2) DEFAULT NULL,
                backlogs INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✓ Students table created\n');

        // Faculty Table
        console.log('4. Creating faculty table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS faculty (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                department VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✓ Faculty table created\n');

        // Admin Table
        console.log('5. Creating admins table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('super','manager') DEFAULT 'manager',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✓ Admins table created\n');

        // Opportunities Table
        console.log('6. Creating opportunities table...');
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
        console.log('   ✓ Opportunities table created\n');

        // Faculty Blogs Table
        console.log('7. Creating faculty_blogs table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS faculty_blogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ Faculty blogs table created\n');

        // Mentorships Table
        console.log('8. Creating mentorships table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mentorships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                student_id INT NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ Mentorships table created\n');

        // Placement Participation Table
        console.log('9. Creating placement_participation table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS placement_participation (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                student_id INT NOT NULL,
                drive_name VARCHAR(255),
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ Placement participation table created\n');

        // Faculty Audit Log Table
        console.log('10. Creating faculty_audit_log table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS faculty_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT,
                action VARCHAR(255),
                details TEXT,
                performed_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ Faculty audit log table created\n');

        // Applications Table
        console.log('11. Creating applications table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                opportunity_id INT NOT NULL,
                status ENUM('applied','shortlisted','selected','rejected') DEFAULT 'applied',
                applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✓ Applications table created\n');

        // Insert Sample Data
        console.log('12. Inserting sample data...\n');

        // Admins
        console.log('   - Inserting admin...');
        await connection.query(`
            INSERT IGNORE INTO admins (name, email, password, role) VALUES
            ('Admin', 'admin@example.com', '$2b$10$sgMgQm5RDR6OR5i2o7YNYeyfZhOCttMrrh12Q5fS1ojsvgd926gNO', 'super')
        `);
        console.log('     ✓ Admin added');

        // Faculty
        console.log('   - Inserting faculty...');
        await connection.query(`
            INSERT IGNORE INTO faculty (name, email, department, password) VALUES
            ('Jane Smith', 'faculty@example.com', 'CSE', '$2b$10$gF750MVnmXWAqFV6RPS14OyBdCm4443CAIwEhbRrycE4a9kEY0cvy')
        `);
        console.log('     ✓ Faculty added');

        // Students
        console.log('   - Inserting students...');
        await connection.query(`
            INSERT IGNORE INTO students (name, email, password, branch, year) VALUES
            ('John Doe', 'student@example.com', '$2b$10$K0jLlsVxV5hX9PfTFA7y5u06k3.KRvm/2E2a22trdM/1f9FeLNoVa', 'CSE', '3')
        `);
        console.log('     ✓ Students added');

        // Opportunities
        console.log('   - Inserting opportunities...');
        await connection.query(`
            INSERT IGNORE INTO opportunities (title, type, description, faculty_id, faculty_name, posted_by) VALUES
            ('AI Workshop', 'hackathon', 'Hands-on AI Workshop for students', 1, 'Jane Smith', 'faculty')
        `);
        await connection.query(`
            INSERT IGNORE INTO opportunities (title, type, description, company_name, salary_package, eligibility, process_details, due_date, posted_by) 
            VALUES
            ('ABC Tech Hiring Drive', 'placement', 'Hiring for 2026 batch', 'ABC Tech', 12.5, 'B.Tech CSE/ECE', 'Written Test + Interview', '2025-11-30', 'admin')
        `);
        console.log('     ✓ Opportunities added\n');

        // Display table structures
        console.log('13. Verifying table structures:\n');

        const tables = ['students', 'faculty', 'admins', 'opportunities', 'applications'];
        for (const table of tables) {
            const [rows] = await connection.query(`DESCRIBE ${table}`);
            console.log(`   ✓ ${table}: ${rows.length} columns`);
        }

        console.log('\n14. Displaying data summaries:\n');

        // Count records
        const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
        console.log(`   - Students: ${students[0].count} records`);

        const [faculty] = await connection.query('SELECT COUNT(*) as count FROM faculty');
        console.log(`   - Faculty: ${faculty[0].count} records`);

        const [admins] = await connection.query('SELECT COUNT(*) as count FROM admins');
        console.log(`   - Admins: ${admins[0].count} records`);

        const [opportunities] = await connection.query('SELECT COUNT(*) as count FROM opportunities');
        console.log(`   - Opportunities: ${opportunities[0].count} records`);

        console.log('\n✅ DATABASE SETUP COMPLETED SUCCESSFULLY!\n');

    } catch (error) {
        console.error('❌ Error during setup:', error.message);
        if (error.sqlMessage) {
            console.error('SQL Error:', error.sqlMessage);
        }
    } finally {
        await connection.end();
    }
}

setupDatabase();
