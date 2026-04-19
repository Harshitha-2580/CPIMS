-- Migration: Add superadmin/admin roles and privileges to admins table
ALTER TABLE admins 
  MODIFY COLUMN role ENUM('superadmin','admin') DEFAULT 'admin',
  ADD COLUMN privileges TEXT DEFAULT NULL;

-- Make the existing admin (id=1) the superadmin
UPDATE admins SET role='superadmin' WHERE id=1;
