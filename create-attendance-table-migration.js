const db = require('./backend/db');

// Create attendance table
async function createAttendanceTable() {
    try {
        console.log('Connected to database');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS attendance (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                opportunity_id INT NOT NULL,
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('present', 'late') DEFAULT 'present',
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (opportunity_id) REFERENCES placements(id) ON DELETE CASCADE,
                UNIQUE KEY unique_attendance (student_id, opportunity_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `;

        await db.execute(createTableQuery);
        console.log('Attendance table created successfully!');

    } catch (error) {
        console.error('Error creating attendance table:', error);
    }
}

createAttendanceTable();