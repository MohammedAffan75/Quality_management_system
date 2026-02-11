-- Migration script to add inspection_plan_status column to parts table
-- Run this script to add the new column to your database

-- Add inspection_plan_status column to parts table
ALTER TABLE parts 
ADD COLUMN IF NOT EXISTS inspection_plan_status BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN parts.inspection_plan_status IS 'Inspection plan status - toggleable boolean flag for parts';

