-- Migration script to add location, placement_type, and event_date columns to placements table
-- Run this script against the existing database to add the missing columns

ALTER TABLE placements 
ADD COLUMN IF NOT EXISTS event_date DATETIME DEFAULT NULL AFTER due_date,
ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL AFTER event_date,
ADD COLUMN IF NOT EXISTS placement_type ENUM('internship', 'full-time', 'contract', 'part-time') DEFAULT 'full-time' AFTER location;

-- Add index for event_date if not exists
CREATE INDEX IF NOT EXISTS idx_event_date ON placements(event_date);
