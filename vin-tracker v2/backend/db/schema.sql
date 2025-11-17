-- Create database (run this first)
-- CREATE DATABASE vin_tracker;

-- Connect to the database
-- \c vin_tracker;

-- Create delivery_records table
CREATE TABLE IF NOT EXISTS delivery_records (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(255) NOT NULL,
    char_count INTEGER NOT NULL,
    registered BOOLEAN DEFAULT FALSE,
    repeat_count INTEGER DEFAULT 0,
    last_repeated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service_records table
CREATE TABLE IF NOT EXISTS service_records (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(255) NOT NULL,
    char_count INTEGER NOT NULL,
    registered BOOLEAN DEFAULT FALSE,
    repeat_count INTEGER DEFAULT 0,
    last_repeated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_vin ON delivery_records(vin);
CREATE INDEX IF NOT EXISTS idx_service_vin ON service_records(vin);
CREATE INDEX IF NOT EXISTS idx_delivery_registered ON delivery_records(registered);
CREATE INDEX IF NOT EXISTS idx_service_registered ON service_records(registered);
CREATE INDEX IF NOT EXISTS idx_delivery_created ON delivery_records(created_at);
CREATE INDEX IF NOT EXISTS idx_service_created ON service_records(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_delivery_updated_at ON delivery_records;
CREATE TRIGGER update_delivery_updated_at
    BEFORE UPDATE ON delivery_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_updated_at ON service_records;
CREATE TRIGGER update_service_updated_at
    BEFORE UPDATE ON service_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
