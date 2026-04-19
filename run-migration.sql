-- Add missing can_manage_admins privilege column if it doesn't exist
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS can_manage_admins TINYINT(1) DEFAULT 0;

-- Grant can_manage_admins to all existing superadmins
UPDATE admins SET can_manage_admins = 1 WHERE role IN ('super', 'superadmin');

-- Verify the migration
SELECT id, name, email, role, can_manage_admins, can_approve_students FROM admins;
