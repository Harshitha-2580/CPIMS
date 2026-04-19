-- Add can_edit_public_pages privilege column to admins table
ALTER TABLE admins ADD COLUMN can_edit_public_pages TINYINT DEFAULT 0 AFTER can_manage_admins;

-- For backward compatibility, grant this privilege to existing superadmins
UPDATE admins SET can_edit_public_pages = 1 WHERE role IN ('superadmin', 'super');
