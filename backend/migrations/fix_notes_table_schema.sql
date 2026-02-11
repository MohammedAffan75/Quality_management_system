-- Migration script to fix notes table schema - remove note_id column if it exists
-- Run this script using: psql -U your_username -d your_database -f migrations/fix_notes_table_schema.sql

-- Remove note_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notes' 
        AND column_name = 'note_id'
    ) THEN
        ALTER TABLE notes 
        DROP COLUMN note_id;
        
        RAISE NOTICE 'Removed note_id column from notes table';
    ELSE
        RAISE NOTICE 'Column note_id does not exist in notes table';
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notes' 
ORDER BY ordinal_position;
