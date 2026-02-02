-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS faculty_password_resets;
DROP TABLE IF EXISTS faculty_auth;
DROP TABLE IF EXISTS faculty_events;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS mentorships;
DROP TABLE IF EXISTS faculty_resources;
DROP TABLE IF EXISTS faculty_blogs;
DROP TABLE IF EXISTS faculty;

-- Enable foreign key checks again
SET FOREIGN_KEY_CHECKS=1;

-- Create faculty table
CREATE TABLE faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(20),
    office_room VARCHAR(50),
    is_active TINYINT DEFAULT 1,
    last_active DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create faculty_auth table for email and password
CREATE TABLE faculty_auth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    password_reset_required TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create faculty_password_resets table
CREATE TABLE faculty_password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) NOT NULL,
    reset_token VARCHAR(255) NOT NULL,
    token_expires DATETIME NOT NULL,
    is_used TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 20 faculty members with predefined IDs
INSERT INTO faculty (faculty_id, name, department, designation, phone) VALUES
('NECN_FAC_001', 'Dr. Rajesh Kumar', 'Computer Science', 'Professor', '9876543210'),
('NECN_FAC_002', 'Dr. Priya Sharma', 'Computer Science', 'Associate Professor', '9876543211'),
('NECN_FAC_003', 'Mr. Arjun Patel', 'Information Technology', 'Assistant Professor', '9876543212'),
('NECN_FAC_004', 'Dr. Neha Singh', 'Computer Science', 'Professor', '9876543213'),
('NECN_FAC_005', 'Mr. Vikram Gupta', 'Information Technology', 'Associate Professor', '9876543214'),
('NECN_FAC_006', 'Dr. Anjali Verma', 'Computer Science', 'Assistant Professor', '9876543215'),
('NECN_FAC_007', 'Mr. Rohan Desai', 'Information Technology', 'Professor', '9876543216'),
('NECN_FAC_008', 'Dr. Meera Iyer', 'Computer Science', 'Associate Professor', '9876543217'),
('NECN_FAC_009', 'Mr. Sandeep Nair', 'Information Technology', 'Assistant Professor', '9876543218'),
('NECN_FAC_010', 'Dr. Harshitha Bheemir', 'Computer Science', 'Professor', '9876543219'),
('NECN_FAC_011', 'Mr. Aditya Saxena', 'Information Technology', 'Associate Professor', '9876543220'),
('NECN_FAC_012', 'Dr. Pooja Malhotra', 'Computer Science', 'Assistant Professor', '9876543221'),
('NECN_FAC_013', 'Mr. Karan Chopra', 'Information Technology', 'Professor', '9876543222'),
('NECN_FAC_014', 'Dr. Sneha Reddy', 'Computer Science', 'Associate Professor', '9876543223'),
('NECN_FAC_015', 'Mr. Ashok Kumar', 'Information Technology', 'Assistant Professor', '9876543224'),
('NECN_FAC_016', 'Dr. Divya Nayak', 'Computer Science', 'Professor', '9876543225'),
('NECN_FAC_017', 'Mr. Sameer Khan', 'Information Technology', 'Associate Professor', '9876543226'),
('NECN_FAC_018', 'Dr. Ruchi Pandey', 'Computer Science', 'Assistant Professor', '9876543227'),
('NECN_FAC_019', 'Mr. Nitin Joshi', 'Information Technology', 'Professor', '9876543228'),
('NECN_FAC_020', 'Dr. Shruti Pillai', 'Computer Science', 'Associate Professor', '9876543229');

-- Create other supporting tables
CREATE TABLE faculty_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(100),
    description TEXT,
    event_date DATETIME,
    location VARCHAR(200),
    eligible_branches VARCHAR(255),
    eligible_years LONGTEXT,
    max_attendees INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    opportunity_type VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    salary VARCHAR(100),
    eligibility_criteria TEXT,
    application_deadline DATE,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mentorships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) NOT NULL,
    student_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE faculty_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) NOT NULL,
    resource_name VARCHAR(200) NOT NULL,
    resource_type VARCHAR(50),
    file_path VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE faculty_blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
