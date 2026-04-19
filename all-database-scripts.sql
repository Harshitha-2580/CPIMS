-- Consolidated Database Script
-- Generated on: 2026-04-15 15:57:42
-- Source: All .sql files in workspace

-- NOTE: Original files remain unchanged.


-- ==========================================
-- BEGIN FILE: .\add-campus-type-column.sql
-- ==========================================

-- Migration script to add campus_type column to placements table
-- This stores the drive type: on-campus, off-campus, pool-campus

ALTER TABLE placements 
ADD COLUMN IF NOT EXISTS campus_type VARCHAR(50) DEFAULT 'on-campus';

-- Add index for campus_type
CREATE INDEX IF NOT EXISTS idx_campus_type ON placements(campus_type);

-- END FILE: .\add-campus-type-column.sql


-- ==========================================
-- BEGIN FILE: .\add-faculty-privileges-and-campus.sql
-- ==========================================

USE placement_portal2;

ALTER TABLE faculty
    ADD COLUMN IF NOT EXISTS campus_type VARCHAR(10) NOT NULL DEFAULT 'NECN',
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS designation VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS can_post_events BOOLEAN DEFAULT 0,
    ADD COLUMN IF NOT EXISTS can_upload_resources BOOLEAN DEFAULT 0,
    ADD COLUMN IF NOT EXISTS can_post_internships BOOLEAN DEFAULT 0,
    ADD COLUMN IF NOT EXISTS can_monitor_assigned_drives BOOLEAN DEFAULT 0;

UPDATE faculty SET campus_type = COALESCE(NULLIF(campus_type, ''), 'NECN');

ALTER TABLE faculty_resources
    ADD COLUMN IF NOT EXISTS uploaded_file_path VARCHAR(255) NULL;

USE placement_portal3;

CREATE TABLE IF NOT EXISTS faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    department VARCHAR(100),
    phone VARCHAR(20),
    designation VARCHAR(100),
    qualification VARCHAR(255),
    profile_image VARCHAR(255),
    campus_type VARCHAR(10) NOT NULL DEFAULT 'NECG',
    can_post_events BOOLEAN DEFAULT 0,
    can_upload_resources BOOLEAN DEFAULT 0,
    can_post_internships BOOLEAN DEFAULT 0,
    can_monitor_assigned_drives BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    password_reset_required BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP NULL,
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS faculty_auth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    password_reset_required BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_faculty_auth_id (faculty_id),
    INDEX idx_faculty_auth_email (email),
    CONSTRAINT fk_faculty_auth_faculty_necg
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS faculty_password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    token_expires DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_faculty_password_reset_faculty_necg
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

ALTER TABLE faculty_resources
    ADD COLUMN IF NOT EXISTS uploaded_file_path VARCHAR(255) NULL;

-- END FILE: .\add-faculty-privileges-and-campus.sql


-- ==========================================
-- BEGIN FILE: .\add-interview-rounds-column.sql
-- ==========================================

-- Add interview_rounds column to placements table as TEXT (DB-only storage)
-- Run this once on the target database

ALTER TABLE placements
ADD COLUMN interview_rounds TEXT NULL AFTER placement_type;

-- END FILE: .\add-interview-rounds-column.sql


-- ==========================================
-- BEGIN FILE: .\add-manage-admins-privilege.sql
-- ==========================================

-- Migration: Add can_manage_admins and can_approve_students privileges to admins table

ALTER TABLE admins
  ADD COLUMN can_manage_admins TINYINT(1) DEFAULT 0,
  ADD COLUMN can_approve_students TINYINT(1) DEFAULT 0;

-- Grant these privileges to all existing superadmins
UPDATE admins SET can_manage_admins = 1, can_approve_students = 1 WHERE role IN ('super', 'superadmin');

-- END FILE: .\add-manage-admins-privilege.sql


-- ==========================================
-- BEGIN FILE: .\add-sample-data.sql
-- ==========================================

-- Add sample data for Students and Faculty
USE placement_portal2;

-- ===== FACULTY DATA =====
-- Password for all faculty: Faculty@123 (hashed with bcrypt)
-- Email left blank/NULL as per requirement - to be filled after first successful login

INSERT INTO faculty (faculty_id, name, email, password, department, phone, designation, qualification, is_active, password_reset_required) VALUES
-- CSE Department
('NECN_FAC_001', 'Dr. Rajesh Kumar', 'faculty.001@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'CSE', '9876543210', 'Professor', 'Ph.D. in Computer Science', 1, 1),
('NECN_FAC_002', 'Prof. Ananya Sharma', 'faculty.002@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'CSE', '9876543211', 'Assistant Professor', 'M.Tech in Computer Science', 1, 1),
('NECN_FAC_003', 'Dr. Vikram Singh', 'faculty.003@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'CSE', '9876543212', 'Professor', 'Ph.D. in Artificial Intelligence', 1, 1),
('NECN_FAC_004', 'Prof. Priya Gupta', 'faculty.004@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'CSE', '9876543213', 'Assistant Professor', 'M.Tech in Data Science', 1, 1),

-- ECE Department
('NECN_FAC_005', 'Dr. Amit Patel', 'faculty.005@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'ECE', '9876543214', 'Professor', 'Ph.D. in Electronics', 1, 1),
('NECN_FAC_006', 'Prof. Deepika Verma', 'faculty.006@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'ECE', '9876543215', 'Assistant Professor', 'M.Tech in Communication Systems', 1, 1),
('NECN_FAC_007', 'Dr. Rohan Iyer', 'faculty.007@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'ECE', '9876543216', 'Assistant Professor', 'M.Tech in Signal Processing', 1, 1),

-- EEE Department
('NECN_FAC_008', 'Dr. Suresh Nair', 'faculty.008@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'EEE', '9876543217', 'Professor', 'Ph.D. in Electrical Engineering', 1, 1),
('NECN_FAC_009', 'Prof. Neha Singh', 'faculty.009@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'EEE', '9876543218', 'Assistant Professor', 'M.Tech in Power Systems', 1, 1),

-- Civil Department
('NECN_FAC_010', 'Dr. Arun Kumar', 'faculty.010@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'Civil', '9876543219', 'Professor', 'Ph.D. in Civil Engineering', 1, 1),
('NECN_FAC_011', 'Prof. Kavya Reddy', 'faculty.011@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'Civil', '9876543220', 'Assistant Professor', 'M.Tech in Structural Engineering', 1, 1),

-- Mechanical Department
('NECN_FAC_012', 'Dr. Prakash Kumar', 'faculty.012@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'Mechanical', '9876543221', 'Professor', 'Ph.D. in Mechanical Engineering', 1, 1),
('NECN_FAC_013', 'Prof. Meera Patel', 'faculty.013@pending.email', '$2b$10$unJkzfHu18UkTkV65gZFTubxhQnrayUHLkrbkZNKrka2jaw.Zx2Q2', 'Mechanical', '9876543222', 'Assistant Professor', 'M.Tech in Thermal Engineering', 1, 1);


-- ===== STUDENT DATA =====
-- Password for all students: Student@123 (hashed with bcrypt)
-- Mix of 3rd and 4th year students

INSERT INTO students (name, email, password, branch, year, cgpa, backlogs, placement_status, gender, roll_no, phone) VALUES
-- 3rd Year CSE Students
('Akshay Sharma', 'akshay.sharma.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '3', 8.5, 0, 'unplaced', 'M', 'CSE21001', '9876543201'),
('Priya Singh', 'priya.singh.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '3', 8.8, 0, 'unplaced', 'F', 'CSE21002', '9876543202'),
('Rohit Das', 'rohit.das.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '3', 7.9, 1, 'unplaced', 'M', 'CSE21003', '9876543203'),
('Divya Nair', 'divya.nair.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '3', 8.6, 0, 'unplaced', 'F', 'CSE21004', '9876543204'),
('Vikram Patel', 'vikram.patel.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '3', 8.2, 0, 'unplaced', 'M', 'CSE21005', '9876543205'),

-- 3rd Year ECE Students
('Sneha Verma', 'sneha.verma.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '3', 8.4, 0, 'unplaced', 'F', 'ECE21001', '9876543206'),
('Arjun Reddy', 'arjun.reddy.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '3', 7.8, 1, 'unplaced', 'M', 'ECE21002', '9876543207'),
('Anjali Pillai', 'anjali.pillai.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '3', 8.3, 0, 'unplaced', 'F', 'ECE21003', '9876543208'),
('Nikhil Gupta', 'nikhil.gupta.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '3', 8.1, 0, 'unplaced', 'M', 'ECE21004', '9876543209'),

-- 3rd Year EEE Students
('Ravi Kumar', 'ravi.kumar.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'EEE', '3', 7.6, 2, 'unplaced', 'M', 'EEE21001', '9876543210'),
('Pooja Nair', 'pooja.nair.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'EEE', '3', 8.0, 1, 'unplaced', 'F', 'EEE21002', '9876543211'),
('Sanjay Iyer', 'sanjay.iyer.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'EEE', '3', 7.9, 0, 'unplaced', 'M', 'EEE21003', '9876543212'),

-- 3rd Year Civil Students
('Bhavana Singh', 'bhavana.singh.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Civil', '3', 8.2, 0, 'unplaced', 'F', 'CIVIL21001', '9876543213'),
('Ashok Verma', 'ashok.verma.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Civil', '3', 7.7, 1, 'unplaced', 'M', 'CIVIL21002', '9876543214'),

-- 3rd Year Mechanical Students
('Neha Reddy', 'neha.reddy.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Mechanical', '3', 8.0, 0, 'unplaced', 'F', 'MECH21001', '9876543215'),
('Rajesh Nair', 'rajesh.nair.21@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Mechanical', '3', 7.5, 2, 'unplaced', 'M', 'MECH21002', '9876543216'),

-- 4th Year CSE Students
('Vansh Sharma', 'vansh.sharma.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '4', 8.7, 0, 'unplaced', 'M', 'CSE20001', '9876543217'),
('Isha Gupta', 'isha.gupta.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '4', 8.9, 0, 'unplaced', 'F', 'CSE20002', '9876543218'),
('Siddharth Patel', 'siddharth.patel.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '4', 8.3, 0, 'unplaced', 'M', 'CSE20003', '9876543219'),
('Shreya Singh', 'shreya.singh.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'CSE', '4', 8.6, 0, 'unplaced', 'F', 'CSE20004', '9876543220'),

-- 4th Year ECE Students
('Kalesh Kumar', 'kalesh.kumar.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '4', 8.1, 0, 'unplaced', 'M', 'ECE20001', '9876543221'),
('Tanvi Sharma', 'tanvi.sharma.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '4', 8.5, 0, 'unplaced', 'F', 'ECE20002', '9876543222'),
('Yash Verma', 'yash.verma.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'ECE', '4', 7.8, 1, 'unplaced', 'M', 'ECE20003', '9876543223'),

-- 4th Year EEE Students
('Megha Patel', 'megha.patel.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'EEE', '4', 8.2, 0, 'unplaced', 'F', 'EEE20001', '9876543224'),
('Aditya Das', 'aditya.das.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'EEE', '4', 7.9, 0, 'unplaced', 'M', 'EEE20002', '9876543225'),

-- 4th Year Civil Students
('Priya Verma', 'priya.verma.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Civil', '4', 8.0, 0, 'unplaced', 'F', 'CIVIL20001', '9876543226'),
('Arjun Singh', 'arjun.singh.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Civil', '4', 7.6, 2, 'unplaced', 'M', 'CIVIL20002', '9876543227'),

-- 4th Year Mechanical Students
('Divya Kumar', 'divya.kumar.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Mechanical', '4', 8.3, 0, 'unplaced', 'F', 'MECH20001', '9876543228'),
('Vishal Singh', 'vishal.singh.20@nec.edu', '$2b$10$PMxnN9qxhOFYTVkivnfI4O835x9G/5ffyoVPpcamxY8xcJj5ixS3e', 'Mechanical', '4', 7.4, 3, 'unplaced', 'M', 'MECH20002', '9876543229');


-- END FILE: .\add-sample-data.sql


-- ==========================================
-- BEGIN FILE: .\backend\create-student-placements-table.sql
-- ==========================================

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

-- END FILE: .\backend\create-student-placements-table.sql


-- ==========================================
-- BEGIN FILE: .\backend\migrate-student-placements.sql
-- ==========================================

-- Migration script to populate student_placements table with existing data
-- Run this after creating the student_placements table

-- Insert data for students assigned directly to drives (assignments_drives table)
INSERT INTO student_placements (student_id, company_name, job_role, salary_package, placement_type, location, placement_date, created_at)
SELECT
  CAST(ad.student_id AS UNSIGNED) as student_id,
  ad.company_name,
  ad.job_role,
  ad.salary_package,
  COALESCE(ad.location_type, 'oncampus') as placement_type,
  ad.location,
  COALESCE(ad.drive_date, ad.created_at) as placement_date,
  ad.created_at
FROM assignments_drives ad
WHERE ad.salary_package IS NOT NULL AND ad.salary_package != ''
  AND NOT EXISTS (
    SELECT 1 FROM student_placements sp WHERE sp.student_id = CAST(ad.student_id AS UNSIGNED)
  );

-- For students placed through rounds, we need to derive their placement details
-- This is more complex as we need to find their final placement from placement_round_results
-- For now, we'll insert placeholder records that can be updated manually or through admin interface
INSERT INTO student_placements (student_id, company_name, job_role, salary_package, placement_type, placement_date, created_at)
SELECT
  s.id as student_id,
  'To Be Updated' as company_name,
  'To Be Updated' as job_role,
  '0' as salary_package,
  'oncampus' as placement_type,
  s.created_at as placement_date,
  NOW() as created_at
FROM students s
WHERE s.placement_status = 'placed'
  AND NOT EXISTS (
    SELECT 1 FROM student_placements sp WHERE sp.student_id = s.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM assignments_drives ad WHERE CAST(ad.student_id AS UNSIGNED) = s.id
  );

-- Update student placement status to ensure consistency
UPDATE students s
SET placement_status = 'placed'
WHERE EXISTS (
  SELECT 1 FROM student_placements sp WHERE sp.student_id = s.id
);

-- END FILE: .\backend\migrate-student-placements.sql


-- ==========================================
-- BEGIN FILE: .\create-attendance-table.sql
-- ==========================================

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

-- END FILE: .\create-attendance-table.sql


-- ==========================================
-- BEGIN FILE: .\create-mentee-assignments.sql
-- ==========================================

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

-- END FILE: .\create-mentee-assignments.sql


-- ==========================================
-- BEGIN FILE: .\create-pending-students-migration.sql
-- ==========================================

-- Migration script to create pending_students table
-- Run this in both placement_portal2 (NECN) and placement_portal3 (NECG) databases

-- For placement_portal2 (NECN)
USE placement_portal2;

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
  approved_by VARCHAR(100) NULL,
  rejection_reason TEXT NULL,
  UNIQUE KEY unique_email (email),
  UNIQUE KEY unique_roll_no (roll_no)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- For placement_portal3 (NECG)
USE placement_portal3;

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
  approved_by VARCHAR(100) NULL,
  rejection_reason TEXT NULL,
  UNIQUE KEY unique_email (email),
  UNIQUE KEY unique_roll_no (roll_no)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- END FILE: .\create-pending-students-migration.sql


-- ==========================================
-- BEGIN FILE: .\create-pending-students-table.sql
-- ==========================================

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

-- END FILE: .\create-pending-students-table.sql


-- ==========================================
-- BEGIN FILE: .\fix-attendance-fk.sql
-- ==========================================

-- Fix attendance table foreign key to reference placements instead of opportunities
ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_2;
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (opportunity_id) REFERENCES placements(id) ON DELETE CASCADE;

-- END FILE: .\fix-attendance-fk.sql


-- ==========================================
-- BEGIN FILE: .\migrate-admins-privileges.sql
-- ==========================================

-- Migration: Add privilege columns to admins table and set admin@example.com as superadmin

ALTER TABLE admins
  ADD COLUMN can_add_faculty TINYINT(1) DEFAULT 0,
  ADD COLUMN can_generate_reports TINYINT(1) DEFAULT 0,
  ADD COLUMN can_post_opportunities TINYINT(1) DEFAULT 0,
  ADD COLUMN can_assign_students_opportunities TINYINT(1) DEFAULT 0,
  ADD COLUMN can_approve_students TINYINT(1) DEFAULT 0;

UPDATE admins SET role='super' WHERE email='admin@example.com';

UPDATE admins SET can_approve_students = 1 WHERE role IN ('super', 'superadmin');

-- END FILE: .\migrate-admins-privileges.sql


-- ==========================================
-- BEGIN FILE: .\migrate-admins-superadmin.sql
-- ==========================================

-- Migration: Add superadmin/admin roles and privileges to admins table
ALTER TABLE admins 
  MODIFY COLUMN role ENUM('superadmin','admin') DEFAULT 'admin',
  ADD COLUMN privileges TEXT DEFAULT NULL;

-- Make the existing admin (id=1) the superadmin
UPDATE admins SET role='superadmin' WHERE id=1;

-- END FILE: .\migrate-admins-superadmin.sql


-- ==========================================
-- BEGIN FILE: .\migrate-placements.sql
-- ==========================================

-- Migration script to add location, placement_type, and event_date columns to placements table
-- Run this script against the existing database to add the missing columns

ALTER TABLE placements 
ADD COLUMN IF NOT EXISTS event_date DATETIME DEFAULT NULL AFTER due_date,
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL AFTER event_date,
ADD COLUMN IF NOT EXISTS placement_type ENUM('internship', 'full-time', 'contract', 'part-time') DEFAULT 'full-time' AFTER location;

-- Add index for event_date if not exists
CREATE INDEX IF NOT EXISTS idx_event_date ON placements(event_date);

-- END FILE: .\migrate-placements.sql


-- ==========================================
-- BEGIN FILE: .\run-migration.sql
-- ==========================================

-- Add missing can_manage_admins privilege column if it doesn't exist
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS can_manage_admins TINYINT(1) DEFAULT 0;

-- Grant can_manage_admins to all existing superadmins
UPDATE admins SET can_manage_admins = 1 WHERE role IN ('super', 'superadmin');

-- Verify the migration
SELECT id, name, email, role, can_manage_admins, can_approve_students FROM admins;

-- END FILE: .\run-migration.sql


-- ==========================================
-- BEGIN FILE: .\schema_placement_portal2.sql
-- ==========================================

-- MySQL dump 10.13  Distrib 8.4.6, for Win64 (x86_64)
--
-- Host: localhost    Database: placement_portal2
-- ------------------------------------------------------
-- Server version	8.4.6

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('super','manager') DEFAULT 'manager',
  `can_add_faculty` tinyint(1) DEFAULT 0,
  `can_generate_reports` tinyint(1) DEFAULT 0,
  `can_post_opportunities` tinyint(1) DEFAULT 0,
  `can_assign_students_opportunities` tinyint(1) DEFAULT 0,
  `can_approve_students` tinyint(1) DEFAULT 0,
  `can_manage_admins` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `opportunity_id` int NOT NULL,
  `status` enum('applied','shortlisted','selected','rejected') DEFAULT 'applied',
  `applied_on` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `opportunity_id` (`opportunity_id`),
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assignment_drives`
--

DROP TABLE IF EXISTS `assignment_drives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignment_drives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(50) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `job_role` varchar(255) NOT NULL,
  `salary_package` varchar(100) NOT NULL,
  `due_date` date NOT NULL,
  `description` text,
  `apply_link` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assignments_drives`
--

DROP TABLE IF EXISTS `assignments_drives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments_drives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(50) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `job_role` varchar(255) NOT NULL,
  `salary_package` varchar(100) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `description` text,
  `apply_link` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `location` varchar(255) DEFAULT NULL,
  `location_type` enum('oncampus','offcampus') DEFAULT 'oncampus',
  `drive_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assignments_internships`
--

DROP TABLE IF EXISTS `assignments_internships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments_internships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(50) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `job_role` varchar(255) NOT NULL,
  `internship_type` varchar(50) DEFAULT NULL,
  `stipend` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `description` text,
  `apply_link` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty`
--

DROP TABLE IF EXISTS `faculty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(20) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `campus_type` varchar(10) NOT NULL DEFAULT 'NECN',
  `can_post_events` tinyint(1) DEFAULT '0',
  `can_upload_resources` tinyint(1) DEFAULT '0',
  `can_post_internships` tinyint(1) DEFAULT '0',
  `can_monitor_assigned_drives` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `password_reset_required` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_active` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `faculty_id` (`faculty_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_faculty_id` (`faculty_id`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_audit_log`
--

DROP TABLE IF EXISTS `faculty_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `details` text,
  `performed_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `faculty_audit_log_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_auth`
--

DROP TABLE IF EXISTS `faculty_auth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_auth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `password_reset_required` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `faculty_id` (`faculty_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_faculty_id` (`faculty_id`),
  KEY `idx_email` (`email`),
  CONSTRAINT `faculty_auth_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`faculty_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_blogs`
--

DROP TABLE IF EXISTS `faculty_blogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_blogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `status` enum('draft','published') DEFAULT 'draft',
  `views` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `faculty_blogs_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_event_registrations`
--

DROP TABLE IF EXISTS `faculty_event_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_event_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `student_id` int NOT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('registered','attended','cancelled') DEFAULT 'registered',
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `faculty_event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `faculty_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_events`
--

DROP TABLE IF EXISTS `faculty_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `event_date` datetime NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `eligible_branches` varchar(255) DEFAULT NULL,
  `eligible_years` json DEFAULT NULL,
  `event_type` enum('webinar','workshop','seminar','training') DEFAULT 'webinar',
  `max_attendees` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('draft','published','cancelled') DEFAULT 'draft',
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `faculty_events_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_password_resets`
--

DROP TABLE IF EXISTS `faculty_password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `reset_token` varchar(255) NOT NULL,
  `token_expires` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reset_token` (`reset_token`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `faculty_password_resets_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculty_resources`
--

DROP TABLE IF EXISTS `faculty_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculty_resources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `file_path` varchar(255) NOT NULL,
  `uploaded_file_path` varchar(255) DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `faculty_resources_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `internships`
--

DROP TABLE IF EXISTS `internships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `internship_type` enum('paid','unpaid') NOT NULL,
  `stipend` varchar(100) DEFAULT NULL,
  `duration` varchar(100) NOT NULL,
  `eligible_branches` varchar(500) NOT NULL,
  `eligible_years` varchar(50) DEFAULT NULL,
  `min_cgpa` decimal(3,2) DEFAULT NULL,
  `due_date` date NOT NULL,
  `description` text,
  `apply_link` varchar(500) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company` (`company_name`),
  KEY `idx_type` (`internship_type`),
  KEY `idx_due_date` (`due_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mentee_assignments`
--

DROP TABLE IF EXISTS `mentee_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mentee_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `student_id` int NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_faculty_student` (`faculty_id`,`student_id`),
  KEY `idx_faculty_id` (`faculty_id`),
  KEY `idx_student_id` (`student_id`),
  CONSTRAINT `fk_ma_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ma_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mentorships`
--

DROP TABLE IF EXISTS `mentorships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mentorships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `student_id` int NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `mentorships_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `opportunities`
--

DROP TABLE IF EXISTS `opportunities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `job_role` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` enum('internship','hackathon','competition','placement') DEFAULT 'internship',
  `description` text,
  `eligibility` varchar(255) DEFAULT NULL,
  `salary_package` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `bond` varchar(100) DEFAULT NULL,
  `process_details` text,
  `due_date` date DEFAULT NULL,
  `posted_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','closed','draft') DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  CONSTRAINT `opportunities_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `placement_participation`
--

DROP TABLE IF EXISTS `placement_participation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placement_participation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `student_id` int NOT NULL,
  `drive_name` varchar(255) DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `placement_participation_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`id`) ON DELETE CASCADE,
  CONSTRAINT `placement_participation_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `placement_round_results`
--

DROP TABLE IF EXISTS `placement_round_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placement_round_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `placement_id` int NOT NULL,
  `round_number` int NOT NULL,
  `student_id` int NOT NULL,
  `status` enum('shortlisted','rejected') DEFAULT 'rejected',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_placement_round_student` (`placement_id`,`round_number`,`student_id`),
  KEY `idx_placement_round` (`placement_id`,`round_number`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `placements`
--

DROP TABLE IF EXISTS `placements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `job_role` varchar(255) NOT NULL,
  `salary_package` varchar(100) NOT NULL,
  `eligible_branches` varchar(500) NOT NULL,
  `eligible_years` varchar(50) DEFAULT NULL,
  `min_cgpa` decimal(3,2) DEFAULT NULL,
  `due_date` date NOT NULL,
  `event_date` datetime DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `placement_type` enum('oncampus','offcampus') DEFAULT 'oncampus',
  `interview_rounds` text,
  `description` text,
  `apply_link` varchar(500) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `drive_date` datetime DEFAULT NULL,
  `location_type` enum('oncampus','offcampus') DEFAULT 'oncampus',
  PRIMARY KEY (`id`),
  KEY `idx_company` (`company_name`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_event_date` (`event_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_education`
--

DROP TABLE IF EXISTS `student_education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_education` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `cgpa` decimal(3,2) DEFAULT NULL,
  `backlogs` int DEFAULT '0',
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_notifications`
--

DROP TABLE IF EXISTS `student_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT 'round_shortlist',
  `placement_id` int DEFAULT NULL,
  `round_number` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_round_notice` (`student_id`,`placement_id`,`round_number`,`type`),
  KEY `idx_student_created` (`student_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_resumes`
--

DROP TABLE IF EXISTS `student_resumes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_resumes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `resume_path` varchar(500) NOT NULL,
  `version` int DEFAULT '1',
  `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_id` (`student_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_upload_date` (`upload_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_skills`
--

DROP TABLE IF EXISTS `student_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_skill` (`student_id`,`skill_name`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `branch` varchar(50) DEFAULT NULL,
  `year` enum('1','2','3','4') DEFAULT '1',
  `cgpa` decimal(3,2) DEFAULT NULL,
  `backlogs` int DEFAULT '0',
  `placement_status` enum('placed','unplaced') DEFAULT 'unplaced',
  `gender` enum('M','F','O') DEFAULT 'O',
  `roll_no` varchar(50) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `roll_no` (`roll_no`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-12 12:30:17

-- END FILE: .\schema_placement_portal2.sql


-- ==========================================
-- BEGIN FILE: .\setup-database.sql
-- ==========================================

create database if not exists placement_portal2;
use placement_portal2;

-- Create faculty table with pre-registered IDs
CREATE TABLE faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,  -- Pattern: NECN_FAC_001, NECN_FAC_002, etc.
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    department VARCHAR(100),
    phone VARCHAR(20),
    designation VARCHAR(100),
    qualification VARCHAR(255),
    profile_image VARCHAR(255),
    campus_type VARCHAR(10) NOT NULL DEFAULT 'NECN',
    can_post_events BOOLEAN DEFAULT 0,
    can_upload_resources BOOLEAN DEFAULT 0,
    can_post_internships BOOLEAN DEFAULT 0,
    can_monitor_assigned_drives BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    password_reset_required BOOLEAN DEFAULT 1,  -- Flag to force password reset on first login
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_email (email)
);

-- Create password reset tokens table (FIXED - only one TIMESTAMP with DEFAULT)
CREATE TABLE faculty_password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    token_expires DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Create mentorships table
CREATE TABLE mentorships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Create faculty events table
CREATE TABLE faculty_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(255),
    eligible_branches VARCHAR(255),
    eligible_years JSON,
    event_type ENUM('webinar', 'workshop', 'seminar', 'training') DEFAULT 'webinar',
    max_attendees INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('draft', 'published', 'cancelled') DEFAULT 'draft',
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Create faculty event registrations table
CREATE TABLE faculty_event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    student_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'attended', 'cancelled') DEFAULT 'registered',
    FOREIGN KEY (event_id) REFERENCES faculty_events(id) ON DELETE CASCADE
);

-- Create faculty blogs table (FIXED - removed invalid DEFAULT)
CREATE TABLE faculty_blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    status ENUM('draft', 'published') DEFAULT 'draft',
    views INT DEFAULT 0,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);


-- Create faculty resources table
CREATE TABLE faculty_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    uploaded_file_path VARCHAR(255),
    file_type VARCHAR(50),
    file_size INT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT,
    company_name VARCHAR(255),
    job_role VARCHAR(255),
    title VARCHAR(255),
    type ENUM('internship', 'hackathon', 'competition', 'placement') DEFAULT 'internship',
    description TEXT,
    eligibility VARCHAR(255),
    salary_package VARCHAR(100),
    location VARCHAR(255),
    bond VARCHAR(100),
    process_details TEXT,
    due_date DATE,
    posted_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'closed', 'draft') DEFAULT 'active',
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- Create faculty_auth table (for email, password, and credentials)
CREATE TABLE faculty_auth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    password_reset_required BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_email (email),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);


-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    branch VARCHAR(50),
    year ENUM('1','2','3','4') DEFAULT '1',
    cgpa DECIMAL(3,2) DEFAULT NULL,
    backlogs INT DEFAULT 0,
    placement_status ENUM('placed','unplaced') DEFAULT 'unplaced',
    gender ENUM('M','F','O') DEFAULT 'O',
    roll_no VARCHAR(50) UNIQUE,
    dob DATE DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Admin Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super','manager') DEFAULT 'manager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Placement Participation Table
CREATE TABLE IF NOT EXISTS placement_participation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    student_id INT NOT NULL,
    drive_name VARCHAR(255),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Faculty Audit Log Table
CREATE TABLE IF NOT EXISTS faculty_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT,
    action VARCHAR(255),
    details TEXT,
    performed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    opportunity_id INT NOT NULL,
    status ENUM('applied','shortlisted','selected','rejected') DEFAULT 'applied',
    applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE TABLE internships (
    id INT(11) NOT NULL AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    internship_type ENUM('paid','unpaid') NOT NULL,
    stipend VARCHAR(100) DEFAULT NULL,
    duration VARCHAR(100) NOT NULL,
    eligible_branches VARCHAR(500) NOT NULL,
    eligible_years VARCHAR(50) DEFAULT NULL,
    min_cgpa DECIMAL(3,2) DEFAULT NULL,
    due_date DATE NOT NULL,
    description TEXT DEFAULT NULL,
    apply_link VARCHAR(500) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_company (company_name),
    KEY idx_type (internship_type),
    KEY idx_due_date (due_date)
);

CREATE TABLE placements (
    id INT(11) NOT NULL AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    salary_package VARCHAR(100) NOT NULL,
    eligible_branches VARCHAR(500) NOT NULL,
    eligible_years VARCHAR(50) DEFAULT NULL,
    min_cgpa DECIMAL(3,2) DEFAULT NULL,
    due_date DATE NOT NULL,
    event_date DATETIME DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    placement_type ENUM('oncampus', 'offcampus') DEFAULT 'oncampus',
    interview_rounds TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    apply_link VARCHAR(500) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_company (company_name),
    KEY idx_due_date (due_date),
    KEY idx_event_date (event_date)
);

CREATE TABLE assignment_drives (
    id INT(11) NOT NULL AUTO_INCREMENT,
    student_id VARCHAR(50) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    salary_package VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    description TEXT DEFAULT NULL,
    apply_link VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_student_id (student_id)
);

CREATE TABLE student_education (
    id INT(11) NOT NULL AUTO_INCREMENT,
    student_id INT(11) NOT NULL,
    cgpa DECIMAL(3,2) DEFAULT NULL,
    backlogs INT(11) DEFAULT 0,
    phone VARCHAR(20) DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uk_student_id (student_id)
);

CREATE TABLE student_resumes (
    id INT NOT NULL AUTO_INCREMENT,
    student_id INT NOT NULL UNIQUE,
    resume_path VARCHAR(500) NOT NULL,
    version INT DEFAULT 1,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_student_id (student_id)
);

CREATE TABLE student_skills (
    id INT NOT NULL AUTO_INCREMENT,
    student_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_student_skill (student_id, skill_name),
    KEY idx_student_id (student_id)
);

-- Sample Inserts
INSERT INTO admins (name,email,password,role) VALUES
('Admin','admin@example.com','$2b$10$sgMgQm5RDR6OR5i2o7YNYeyfZhOCttMrrh12Q5fS1ojsvgd926gNO','super');

INSERT INTO students (name,email,password,branch,year) VALUES
('John Doe','student@example.com','$2b$10$K0jLlsVxV5hX9PfTFA7y5u06k3.KRvm/2E2a22trdM/1f9FeLNoVa','CSE','3');

INSERT INTO opportunities 
(title, type, description, salary_package, eligibility, process_details, due_date, posted_by) 
VALUES
('ABC Tech Hiring Drive', 'placement', 'Hiring for 2026 batch', '12.5', 'B.Tech CSE/ECE', 'Written Test + Interview', '2025-11-30', 'admin');

-- END FILE: .\setup-database.sql

