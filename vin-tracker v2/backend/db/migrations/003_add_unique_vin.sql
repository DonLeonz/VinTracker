-- Migration 003: Add UNIQUE constraint to vin column in both tables
-- This enforces at the database level that one VIN can only appear once per table.
-- The application logic already prevents duplicates via checkVin/addVin, but
-- the DB constraint is the last line of defense against race conditions.
--
-- IMPORTANT: Run the Verificación tab first to confirm there are no duplicate VINs
-- in active records before applying this migration. Duplicate rows will cause it to fail.
--
-- Only active (non-deleted) records need uniqueness. Deleted records are kept for
-- historical reference and are excluded from this constraint via a partial index.

-- Delivery: unique VIN among non-deleted records
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_delivery_vin_active
  ON delivery_records (vin)
  WHERE deleted = false;

-- Service: unique VIN among non-deleted records
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_service_vin_active
  ON service_records (vin)
  WHERE deleted = false;
