"""
Migration script to create balloons and measurements tables.
This script can be run manually or called from the application startup.
"""
from sqlalchemy import text
from app.database import engine
import logging

logger = logging.getLogger(__name__)


def create_balloon_tables():
    """Create balloons and measurements tables if they don't exist."""
    migration_sql = """
    -- Create balloons table
    CREATE TABLE IF NOT EXISTS balloons (
        id SERIAL PRIMARY KEY,
        part_id INTEGER NOT NULL,
        document_id INTEGER,
        balloon_id VARCHAR(100) NOT NULL,
        x FLOAT,
        y FLOAT,
        width FLOAT,
        height FLOAT,
        page INTEGER DEFAULT 1,
        nominal FLOAT,
        utol VARCHAR(50),
        ltol VARCHAR(50),
        type VARCHAR(200),
        zone VARCHAR(50),
        measuring_instrument VARCHAR(200),
        op_no VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT fk_balloons_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
        CONSTRAINT fk_balloons_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    -- Create indexes for balloons table
    CREATE INDEX IF NOT EXISTS idx_balloons_part_id ON balloons(part_id);
    CREATE INDEX IF NOT EXISTS idx_balloons_document_id ON balloons(document_id);
    CREATE INDEX IF NOT EXISTS idx_balloons_balloon_id ON balloons(balloon_id);

    -- Create measurements table
    CREATE TABLE IF NOT EXISTS measurements (
        id SERIAL PRIMARY KEY,
        balloon_id INTEGER NOT NULL,
        part_id INTEGER,
        quantity INTEGER DEFAULT 1,
        m1 FLOAT,
        m2 FLOAT,
        m3 FLOAT,
        mean FLOAT,
        go_or_no_go VARCHAR(10) CHECK (go_or_no_go IN ('GO', 'NO_GO')),
        measured_by VARCHAR(255),
        measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        CONSTRAINT fk_measurements_balloon FOREIGN KEY (balloon_id) REFERENCES balloons(id) ON DELETE CASCADE,
        CONSTRAINT fk_measurements_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE SET NULL
    );

    -- Create indexes for measurements table
    CREATE INDEX IF NOT EXISTS idx_measurements_balloon_id ON measurements(balloon_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_part_id ON measurements(part_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON measurements(measured_at);
    """
    
    try:
        with engine.connect() as conn:
            # Execute migration
            conn.execute(text(migration_sql))
            conn.commit()
        logger.info("Balloon and measurement tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating balloon tables: {e}")
        # If tables already exist, that's okay
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            logger.info("Tables may already exist, continuing...")
            return True
        raise


if __name__ == "__main__":
    create_balloon_tables()

