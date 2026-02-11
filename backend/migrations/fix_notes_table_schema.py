"""
Migration script to fix notes table schema - remove note_id column if it exists.
The notes table should only have 'id' as primary key, not 'note_id'.
Run this script using: python migrations/fix_notes_table_schema.py
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
    """Remove note_id column from notes table if it exists."""
    try:
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            try:
                # Check if note_id column exists
                logger.info("Checking if note_id column exists in notes table...")
                check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'notes' 
                    AND column_name = 'note_id'
                """)
                result = conn.execute(check_query)
                exists = result.fetchone() is not None
                
                if exists:
                    logger.info("Found 'note_id' column in notes table. Removing it...")
                    
                    # Drop the column
                    alter_query = text("""
                        ALTER TABLE notes 
                        DROP COLUMN note_id
                    """)
                    conn.execute(alter_query)
                    logger.info("✓ Removed 'note_id' column from notes table")
                else:
                    logger.info("Column 'note_id' does not exist in notes table. No action needed.")
                
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
