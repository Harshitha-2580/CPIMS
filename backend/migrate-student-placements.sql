-- Migration script to populate student_placements table with existing data
-- Run this after creating the student_placements table

-- Insert data for students assigned directly to drives (assignments_drives table)
INSERT INTO student_placements (student_id, company_name, job_role, salary_package, placement_type, location, placement_date, created_at)
SELECT
  CAST(ad.student_id AS UNSIGNED) as student_id,
  ad.company_name,
  ad.job_role,
  ad.salary_package,
  COALESCE(ad.location_type, 'oncampus') as placement_type,
  ad.location,
  COALESCE(ad.drive_date, ad.created_at) as placement_date,
  ad.created_at
FROM assignments_drives ad
WHERE ad.salary_package IS NOT NULL AND ad.salary_package != ''
  AND NOT EXISTS (
    SELECT 1 FROM student_placements sp WHERE sp.student_id = CAST(ad.student_id AS UNSIGNED)
  );

-- For students placed through rounds, we need to derive their placement details
-- This is more complex as we need to find their final placement from placement_round_results
-- For now, we'll insert placeholder records that can be updated manually or through admin interface
INSERT INTO student_placements (student_id, company_name, job_role, salary_package, placement_type, placement_date, created_at)
SELECT
  s.id as student_id,
  'To Be Updated' as company_name,
  'To Be Updated' as job_role,
  '0' as salary_package,
  'oncampus' as placement_type,
  s.created_at as placement_date,
  NOW() as created_at
FROM students s
WHERE s.placement_status = 'placed'
  AND NOT EXISTS (
    SELECT 1 FROM student_placements sp WHERE sp.student_id = s.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM assignments_drives ad WHERE CAST(ad.student_id AS UNSIGNED) = s.id
  );

-- Update student placement status to ensure consistency
UPDATE students s
SET placement_status = 'placed'
WHERE EXISTS (
  SELECT 1 FROM student_placements sp WHERE sp.student_id = s.id
);