-- Migration: Add can_edit_public_pages privilege to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS can_edit_public_pages TINYINT(1) DEFAULT 0;

-- Grant public page editing rights to all existing superadmins and supers
UPDATE admins SET can_edit_public_pages = 1 WHERE role IN ('super', 'superadmin');
