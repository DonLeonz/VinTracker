-- Migration: Add soft delete columns
-- Date: 2026-01-24
-- Description: Add deleted and deleted_at columns to enable trash/recycle bin functionality

-- Add columns to delivery_records
ALTER TABLE delivery_records 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add columns to service_records
ALTER TABLE service_records 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes for better performance on deleted records
CREATE INDEX IF NOT EXISTS idx_delivery_deleted ON delivery_records(deleted);
CREATE INDEX IF NOT EXISTS idx_service_deleted ON service_records(deleted);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_delivery_deleted_date ON delivery_records(deleted, deleted_at);
CREATE INDEX IF NOT EXISTS idx_service_deleted_date ON service_records(deleted, deleted_at);

COMMENT ON COLUMN delivery_records.deleted IS 'Soft delete flag - true if record is in trash';
COMMENT ON COLUMN delivery_records.deleted_at IS 'Timestamp when record was moved to trash';
COMMENT ON COLUMN service_records.deleted IS 'Soft delete flag - true if record is in trash';
COMMENT ON COLUMN service_records.deleted_at IS 'Timestamp when record was moved to trash';
