"""
Migration script to add inspection_plan_status column to parts table.
This script can be run manually or called from the application startup.
"""
from sqlalchemy import text
from app.database import engine
import logging

logger = logging.getLogger(__name__)


def add_inspection_plan_status_to_parts():
    """Add inspection_plan_status column to parts table if it doesn't exist."""
    migration_sql = """
    -- Add inspection_plan_status column to parts table
    ALTER TABLE parts 
    ADD COLUMN IF NOT EXISTS inspection_plan_status BOOLEAN NOT NULL DEFAULT FALSE;
    
    -- Add comment to column
    COMMENT ON COLUMN parts.inspection_plan_status IS 'Inspection plan status - toggleable boolean flag for parts';
    """
    
    try:
        with engine.connect() as conn:
            # Execute migration
            conn.execute(text(migration_sql))
            conn.commit()
        logger.info("Inspection plan status column added to parts table successfully")
        return True
    except Exception as e:
        logger.error(f"Error adding inspection_plan_status column: {e}")
        # If column already exists, that's okay
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            logger.info("Column may already exist, continuing...")
            return True
        raise


if __name__ == "__main__":
    add_inspection_plan_status_to_parts()

