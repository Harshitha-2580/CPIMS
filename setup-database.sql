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
