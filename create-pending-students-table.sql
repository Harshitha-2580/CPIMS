-- Create pending_students table to store student signup requests awaiting approval
CREATE TABLE IF NOT EXISTS pending_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  roll_no VARCHAR(50) NOT NULL UNIQUE,
  branch VARCHAR(50) NOT NULL,
  year ENUM('1','2','3','4') NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  approved_by VARCHAR(100) NULL,
  rejection_reason TEXT NULL,
  UNIQUE KEY unique_email (email),
  UNIQUE KEY unique_roll_no (roll_no)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
