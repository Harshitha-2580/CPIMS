-- Migration script to add campus_type column to placements table
-- This stores the drive type: on-campus, off-campus, pool-campus

ALTER TABLE placements 
ADD COLUMN IF NOT EXISTS campus_type VARCHAR(50) DEFAULT 'on-campus';

-- Add index for campus_type
CREATE INDEX IF NOT EXISTS idx_campus_type ON placements(campus_type);
