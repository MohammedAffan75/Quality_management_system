-- Migration script to convert VARCHAR columns to TEXT in balloons table
-- This fixes the SQLAlchemy "Unknown PG numeric type: 1043" error
-- Run this script using: psql -U your_username -d your_database -f migrations/fix_balloon_varchar_to_text.sql

-- Convert VARCHAR columns to TEXT
-- PostgreSQL allows this conversion without data loss

ALTER TABLE balloons ALTER COLUMN utol TYPE TEXT;
ALTER TABLE balloons ALTER COLUMN ltol TYPE TEXT;
ALTER TABLE balloons ALTER COLUMN type TYPE TEXT;
ALTER TABLE balloons ALTER COLUMN zone TYPE TEXT;
ALTER TABLE balloons ALTER COLUMN measuring_instrument TYPE TEXT;
ALTER TABLE balloons ALTER COLUMN op_no TYPE TEXT;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'balloons' 
AND column_name IN ('utol', 'ltol', 'type', 'zone', 'measuring_instrument', 'op_no')
ORDER BY column_name;
