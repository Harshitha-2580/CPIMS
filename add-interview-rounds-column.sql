-- Add interview_rounds column to placements table as TEXT (DB-only storage)
-- Run this once on the target database

ALTER TABLE placements
ADD COLUMN interview_rounds TEXT NULL AFTER placement_type;
