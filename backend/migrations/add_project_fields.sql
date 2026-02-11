-- Migration: Add project_number, customer_details, reference_no to projects table
-- Run: psql -U your_username -d your_database -f migrations/add_project_fields.sql

DO $$
BEGIN
    -- Add project_number (required - backfill existing rows with PRJ-{id})
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'project_number'
    ) THEN
        ALTER TABLE projects ADD COLUMN project_number VARCHAR(100);
        UPDATE projects SET project_number = 'PRJ-' || id WHERE project_number IS NULL;
        ALTER TABLE projects ALTER COLUMN project_number SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS ix_projects_project_number ON projects(project_number);
        RAISE NOTICE 'Added project_number column to projects table';
    ELSE
        RAISE NOTICE 'Column project_number already exists on projects table';
    END IF;
END $$;

DO $$
BEGIN
    -- Add customer_details (optional)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'customer_details'
    ) THEN
        ALTER TABLE projects ADD COLUMN customer_details VARCHAR(500);
        RAISE NOTICE 'Added customer_details column to projects table';
    ELSE
        RAISE NOTICE 'Column customer_details already exists on projects table';
    END IF;
END $$;

DO $$
BEGIN
    -- Add reference_no (optional)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'reference_no'
    ) THEN
        ALTER TABLE projects ADD COLUMN reference_no VARCHAR(100);
        CREATE INDEX IF NOT EXISTS ix_projects_reference_no ON projects(reference_no);
        RAISE NOTICE 'Added reference_no column to projects table';
    ELSE
        RAISE NOTICE 'Column reference_no already exists on projects table';
    END IF;
END $$;
