-- Migration: Add pdf_content_type to documents table for scanned vs normal PDF handling
-- Run: psql -U your_username -d your_database -f migrations/add_pdf_content_type_to_documents.sql

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'documents'
          AND column_name = 'pdf_content_type'
    ) THEN
        ALTER TABLE documents
        ADD COLUMN pdf_content_type VARCHAR(20) DEFAULT 'normal';

        RAISE NOTICE 'Added pdf_content_type column to documents table';
    ELSE
        RAISE NOTICE 'Column pdf_content_type already exists on documents table';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
  AND column_name = 'pdf_content_type';
