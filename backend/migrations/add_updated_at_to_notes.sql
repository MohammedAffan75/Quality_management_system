-- Migration script to add created_at and updated_at columns to notes table
-- Run this script using: psql -U your_username -d your_database -f migrations/add_updated_at_to_notes.sql

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notes' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notes 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Added created_at column to notes table';
    ELSE
        RAISE NOTICE 'Column created_at already exists in notes table';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notes' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notes 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added updated_at column to notes table';
    ELSE
        RAISE NOTICE 'Column updated_at already exists in notes table';
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notes' 
AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;
