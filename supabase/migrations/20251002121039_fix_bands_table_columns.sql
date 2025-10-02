-- Fix missing columns in bands table that are expected by the frontend

-- Add password_updated_at column if it doesn't exist
ALTER TABLE bands
ADD COLUMN IF NOT EXISTS password_updated_at timestamp with time zone;

-- Ensure shared_password column exists (it should from the initial migration)
ALTER TABLE bands
ADD COLUMN IF NOT EXISTS shared_password text;

-- Update any existing bands to have a password_updated_at if they have a shared_password
UPDATE bands
SET password_updated_at = created_at
WHERE shared_password IS NOT NULL AND password_updated_at IS NULL;