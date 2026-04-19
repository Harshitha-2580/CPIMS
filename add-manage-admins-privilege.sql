-- Migration: Add can_manage_admins and can_approve_students privileges to admins table

ALTER TABLE admins
  ADD COLUMN can_manage_admins TINYINT(1) DEFAULT 0,
  ADD COLUMN can_approve_students TINYINT(1) DEFAULT 0;

-- Grant these privileges to all existing superadmins
UPDATE admins SET can_manage_admins = 1, can_approve_students = 1 WHERE role IN ('super', 'superadmin');
