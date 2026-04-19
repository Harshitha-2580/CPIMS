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

