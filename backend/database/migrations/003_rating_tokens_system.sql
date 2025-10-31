-- ============================================================
-- RATING TOKENS SYSTEM - October 31, 2025
-- ============================================================
-- This migration adds:
-- - rating_tokens table for secure, single-use rating links
-- - waiver_id column to feedback table
-- - Unique constraint to prevent duplicate ratings per waiver
-- ============================================================

-- ============================================================
-- TABLE: rating_tokens
-- Secure tokens for rating links
-- ============================================================
CREATE TABLE IF NOT EXISTS rating_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  waiver_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  used TINYINT(1) DEFAULT 0 COMMENT '0=unused, 1=used',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_waiver_id (waiver_id),
  INDEX idx_used (used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Add waiver_id to feedback table
-- ============================================================
ALTER TABLE feedback 
ADD COLUMN waiver_id INT NULL AFTER user_id,
ADD FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON DELETE SET NULL,
ADD INDEX idx_waiver_id (waiver_id);

-- ============================================================
-- Add unique constraint to prevent duplicate ratings per waiver
-- Only one feedback entry allowed per waiver
-- ============================================================
ALTER TABLE feedback 
ADD UNIQUE KEY unique_waiver_rating (waiver_id);

-- ============================================================
-- Add rating tracking columns to waivers table if not exists
-- These track whether rating email/SMS have been sent
-- ============================================================
ALTER TABLE waivers 
ADD COLUMN IF NOT EXISTS rating_email_sent TINYINT(1) DEFAULT 0 COMMENT '0=not sent, 1=sent, 2=failed',
ADD COLUMN IF NOT EXISTS rating_sms_sent TINYINT(1) DEFAULT 0 COMMENT '0=not sent, 1=sent, 2=failed';

-- ============================================================
-- Migration Complete
-- ============================================================
