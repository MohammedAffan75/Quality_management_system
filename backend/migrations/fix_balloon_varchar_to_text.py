"""
Migration script to convert VARCHAR columns to TEXT in balloons table.
This fixes the SQLAlchemy "Unknown PG numeric type: 1043" error.
Run this script using: python migrations/fix_balloon_varchar_to_text.py
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
    """Convert VARCHAR columns to TEXT in balloons table."""
    try:
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            try:
                logger.info("Converting VARCHAR columns to TEXT in balloons table...")
                
                # Convert each VARCHAR column to TEXT
                # PostgreSQL allows this conversion without data loss
                columns_to_convert = [
                    'utol',
                    'ltol', 
                    'type',
                    'zone',
                    'measuring_instrument',
                    'op_no'
                ]
                
                for column in columns_to_convert:
                    logger.info(f"Converting column '{column}' from VARCHAR to TEXT...")
                    alter_query = text(f"""
                        ALTER TABLE balloons 
                        ALTER COLUMN {column} TYPE TEXT
                    """)
                    conn.execute(alter_query)
                    logger.info(f"✓ Converted column '{column}'")
                
                # Commit the transaction
                trans.commit()
                logger.info("Successfully converted all VARCHAR columns to TEXT!")
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Error during migration: {str(e)}", exc_info=True)
                raise
                
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise

if __name__ == "__main__":
    migrate()
