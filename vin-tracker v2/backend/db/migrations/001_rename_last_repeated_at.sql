-- Migration: Rename last_repeated_at to last_registered_at
-- This script renames the column to better reflect its purpose:
-- It tracks when the VIN was last REGISTERED, not when it was repeated
--
-- Run this migration on existing databases to update the column name

-- Rename column in delivery_records table
ALTER TABLE delivery_records
RENAME COLUMN last_repeated_at TO last_registered_at;

-- Rename column in service_records table
ALTER TABLE service_records
RENAME COLUMN last_repeated_at TO last_registered_at;

-- Verify the changes
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('delivery_records', 'service_records')
    AND column_name = 'last_registered_at';
