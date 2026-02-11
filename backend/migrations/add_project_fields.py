"""
Migration script to add project_number, customer_details, reference_no to projects table.
Run: python -m migrations.add_project_fields
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def run_migration():
    """Run the add_project_fields migration."""
    statements = [
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'project_number'
            ) THEN
                ALTER TABLE projects ADD COLUMN project_number VARCHAR(100);
                UPDATE projects SET project_number = 'PRJ-' || id WHERE project_number IS NULL;
                ALTER TABLE projects ALTER COLUMN project_number SET NOT NULL;
                CREATE UNIQUE INDEX IF NOT EXISTS ix_projects_project_number ON projects(project_number);
            END IF;
        END $$;
        """,
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'customer_details'
            ) THEN
                ALTER TABLE projects ADD COLUMN customer_details VARCHAR(500);
            END IF;
        END $$;
        """,
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'reference_no'
            ) THEN
                ALTER TABLE projects ADD COLUMN reference_no VARCHAR(100);
                CREATE INDEX IF NOT EXISTS ix_projects_reference_no ON projects(reference_no);
            END IF;
        END $$;
        """,
    ]
    with engine.connect() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        conn.commit()
    print("Migration add_project_fields completed successfully.")

if __name__ == "__main__":
    run_migration()
