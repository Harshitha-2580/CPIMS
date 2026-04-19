-- Fix attendance table foreign key to reference placements instead of opportunities
ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_2;
ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (opportunity_id) REFERENCES placements(id) ON DELETE CASCADE;
