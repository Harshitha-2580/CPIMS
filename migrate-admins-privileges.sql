-- Migration: Add privilege columns to admins table and set admin@example.com as superadmin

ALTER TABLE admins
  ADD COLUMN can_add_faculty TINYINT(1) DEFAULT 0,
  ADD COLUMN can_generate_reports TINYINT(1) DEFAULT 0,
  ADD COLUMN can_post_opportunities TINYINT(1) DEFAULT 0,
  ADD COLUMN can_assign_students_opportunities TINYINT(1) DEFAULT 0,
  ADD COLUMN can_approve_students TINYINT(1) DEFAULT 0;

UPDATE admins SET role='super' WHERE email='admin@example.com';

UPDATE admins SET can_approve_students = 1 WHERE role IN ('super', 'superadmin');
