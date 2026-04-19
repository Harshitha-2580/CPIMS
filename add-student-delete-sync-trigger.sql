-- Migration: Keep pending_students in sync when a student is removed
-- Run this in each campus database (placement_portal2 and placement_portal3)

DROP TRIGGER IF EXISTS trg_students_after_delete_cleanup_pending;

CREATE TRIGGER trg_students_after_delete_cleanup_pending
AFTER DELETE ON students
FOR EACH ROW
DELETE FROM pending_students
WHERE email = OLD.email OR roll_no = OLD.roll_no;
