-- Create attendance table for QR code attendance tracking
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