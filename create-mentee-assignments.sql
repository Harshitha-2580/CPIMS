-- Create mentee_assignments table
USE placement_portal2;

CREATE TABLE IF NOT EXISTS mentee_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_faculty_student (faculty_id, student_id),
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_student_id (student_id),
    CONSTRAINT fk_ma_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    CONSTRAINT fk_ma_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assign 2 students to each of 6 faculty members (matching departments)
-- Faculty 1 (CSE - Dr. Rajesh Kumar) -> CSE students 2, 3
-- Faculty 2 (CSE - Prof. Ananya Sharma) -> CSE students 4, 5
-- Faculty 5 (ECE - Dr. Amit Patel) -> ECE students 7, 8
-- Faculty 6 (ECE - Prof. Deepika Verma) -> ECE students 9, 10
-- Faculty 8 (EEE - Dr. Suresh Nair) -> EEE students 11, 12
-- Faculty 10 (Civil - Dr. Arun Kumar) -> Civil students 14, 15

INSERT INTO mentee_assignments (faculty_id, student_id, status) VALUES
-- CSE Faculty
(1, 2, 'active'),
(1, 3, 'active'),
(2, 4, 'active'),
(2, 5, 'active'),
-- ECE Faculty
(5, 7, 'active'),
(5, 8, 'active'),
(6, 9, 'active'),
(6, 10, 'active'),
-- EEE Faculty
(8, 11, 'active'),
(8, 12, 'active'),
-- Civil Faculty
(10, 14, 'active'),
(10, 15, 'active');
