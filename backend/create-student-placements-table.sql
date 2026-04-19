-- Migration to create student_placements table for tracking individual student placement details
-- This table will store the specific company, job role, and salary for each placed student

CREATE TABLE IF NOT EXISTS student_placements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  job_role VARCHAR(255) NOT NULL,
  salary_package VARCHAR(100) NOT NULL,
  placement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  placement_type ENUM('oncampus','offcampus') DEFAULT 'oncampus',
  location VARCHAR(255),
  drive_id INT, -- Reference to placements table if applicable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key to students table
  CONSTRAINT fk_student_placements_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,

  -- Indexes for performance
  INDEX idx_student_id (student_id),
  INDEX idx_company_name (company_name),
  INDEX idx_placement_date (placement_date),
  INDEX idx_drive_id (drive_id),

  -- Ensure one active placement per student (can be extended for multiple placements)
  UNIQUE KEY uk_student_active_placement (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;