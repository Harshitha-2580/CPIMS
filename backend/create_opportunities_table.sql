-- Create Opportunities Table to store placement drives, internships, and hackathons

CREATE TABLE IF NOT EXISTS opportunities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL COMMENT 'placement, internship, hackathon',
    company_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    salary_package DECIMAL(10, 2) NOT NULL COMMENT 'Package in LPA',
    eligible_branches VARCHAR(255) NOT NULL COMMENT 'Comma-separated branch codes or "All"',
    min_cgpa DECIMAL(3, 2) COMMENT 'Minimum CGPA requirement',
    due_date DATE NOT NULL COMMENT 'Application deadline',
    description LONGTEXT COMMENT 'Job description and requirements',
    apply_link VARCHAR(500) NOT NULL COMMENT 'URL to apply for the opportunity',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_type (type),
    INDEX idx_company (company_name),
    INDEX idx_due_date (due_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Applications Table to track student applications
CREATE TABLE IF NOT EXISTS applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    opportunity_id INT NOT NULL,
    student_id INT,
    student_name VARCHAR(255),
    student_email VARCHAR(255),
    branch VARCHAR(50),
    cgpa DECIMAL(3, 2),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('applied', 'shortlisted', 'rejected', 'selected') DEFAULT 'applied',
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    INDEX idx_opportunity (opportunity_id),
    INDEX idx_student_email (student_email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
