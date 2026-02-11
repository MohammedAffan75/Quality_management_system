-- Migration script to create balloons and measurements tables
-- Run this script to add the new tables to your database

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

-- Add comment to tables
COMMENT ON TABLE balloons IS 'Stores balloon annotations (specifications) linked to parts and documents';
COMMENT ON TABLE measurements IS 'Stores actual measurements linked to balloons';

