"""
Migration: Add pdf_content_type to documents table.
Run from backend2: python migrations/add_pdf_content_type_to_documents.py
"""
import os
import sys

# Allow running from backend2 or project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run():
    from app.database import engine
    from sqlalchemy import text

    with engine.connect() as conn:
        # Check if column exists (PostgreSQL)
        r = conn.execute(text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'pdf_content_type'
        """))
        if r.fetchone() is None:
            conn.execute(text("""
                ALTER TABLE documents ADD COLUMN pdf_content_type VARCHAR(20) DEFAULT 'normal'
            """))
            conn.commit()
            print("Added pdf_content_type to documents table.")
        else:
            print("Column pdf_content_type already exists.")


if __name__ == "__main__":
    run()
