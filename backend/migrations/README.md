# Migration Scripts

## Creating Balloon and Measurement Tables

### Option 1: Automatic (Recommended)
The tables will be automatically created when you start the FastAPI application. The `init_db()` function in `app/database.py` will create all tables including balloons and measurements.

### Option 2: Manual SQL Script
Run the SQL script directly on your PostgreSQL database:

```bash
psql -U your_user -d your_database -f migrations/create_balloon_tables.sql
```

### Option 3: Python Script
Run the Python migration script:

```bash
cd backend2
python migrations/create_balloon_tables.py
```

## Tables Created

### `balloons` Table
Stores balloon annotations (specifications) linked to parts and documents.

**Columns:**
- `id` - Primary key
- `part_id` - Foreign key to parts table
- `document_id` - Foreign key to documents table
- `balloon_id` - Unique identifier string
- `x`, `y`, `width`, `height` - Position and dimensions
- `page` - Page number
- `nominal` - Target value
- `utol` - Upper tolerance
- `ltol` - Lower tolerance
- `type` - Dimension type
- `zone` - Zone identifier
- `measuring_instrument` - Required instrument
- `op_no` - Operation number
- `created_at`, `updated_at` - Timestamps

### `measurements` Table
Stores actual measurements linked to balloons.

**Columns:**
- `id` - Primary key
- `balloon_id` - Foreign key to balloons table
- `part_id` - Foreign key to parts table (optional)
- `m1`, `m2`, `m3` - Three measurement values
- `mean` - Calculated mean
- `go_or_no_go` - GO or NO_GO status
- `measured_by` - User/operator name
- `measured_at` - Timestamp
- `notes` - Optional notes

## Notes

- Tables are created automatically on application startup
- Foreign key constraints ensure data integrity
- Indexes are created for efficient querying
- CASCADE deletes ensure related data is cleaned up

