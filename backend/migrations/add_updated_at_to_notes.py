"""
Migration script to add created_at and updated_at columns to notes table.
Run this script using: python migrations/add_updated_at_to_notes.py
"""
import sys
import os
from pathlib import Path

# Add the backend2 directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Add created_at and updated_at columns to notes table if they don't exist."""
    try:
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            try:
                # Check and add created_at column
                logger.info("Checking if created_at column exists in notes table...")
                check_created_at = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notes' 
                    AND column_name = 'created_at'
                """)
                result = conn.execute(check_created_at)
                created_at_exists = result.fetchone() is not None
                
                if created_at_exists:
                    logger.info("Column 'created_at' already exists in notes table.")
                else:
                    logger.info("Adding 'created_at' column to notes table...")
                    alter_created_at = text("""
                        ALTER TABLE notes 
                        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                    """)
                    conn.execute(alter_created_at)
                    logger.info("✓ Added 'created_at' column to notes table")
                
                # Check and add updated_at column
                logger.info("Checking if updated_at column exists in notes table...")
                check_updated_at = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notes' 
                    AND column_name = 'updated_at'
                """)
                result = conn.execute(check_updated_at)
                updated_at_exists = result.fetchone() is not None
                
                if updated_at_exists:
                    logger.info("Column 'updated_at' already exists in notes table.")
                else:
                    logger.info("Adding 'updated_at' column to notes table...")
                    alter_updated_at = text("""
                        ALTER TABLE notes 
                        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE
                    """)
                    conn.execute(alter_updated_at)
                    logger.info("✓ Added 'updated_at' column to notes table")
                
                # Commit the transaction
                trans.commit()
                logger.info("Migration completed successfully!")
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Error during migration: {str(e)}", exc_info=True)
                raise
                
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise

if __name__ == "__main__":
    migrate()
