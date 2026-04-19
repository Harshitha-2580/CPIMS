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