-- Migration: Add reset token columns to staff table
-- Created: 2025-10-27
-- Purpose: Enable secure token-based password reset for staff members

-- Add reset_token column to store unique tokens for password reset
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS token_expiry DATETIME DEFAULT NULL;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_reset_token ON staff(reset_token);

-- Add index for token expiry cleanup queries
CREATE INDEX IF NOT EXISTS idx_token_expiry ON staff(token_expiry);
