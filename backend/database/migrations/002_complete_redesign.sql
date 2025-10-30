-- ============================================================
-- COMPLETE DATABASE REDESIGN - October 29, 2025
-- ============================================================
-- This migration recreates the entire database schema with:
-- - One user per phone number (not multiple customers)
-- - Waivers with historical snapshots
-- - Proper foreign keys and indexes
-- ============================================================

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS waiver_minors;
DROP TABLE IF EXISTS minors;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS waiver_forms;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS otps;
DROP TABLE IF EXISTS staff;

-- ============================================================
-- TABLE: users
-- One record per phone number, stores current/latest info
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  dob DATE,
  address VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country_code VARCHAR(10) DEFAULT '+1',
  cell_phone VARCHAR(20) NOT NULL,
  home_phone VARCHAR(20),
  work_phone VARCHAR(20),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  can_email TINYINT(1) DEFAULT 0,
  status TINYINT(1) DEFAULT 0 COMMENT '0=unverified, 1=verified',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cell_phone (cell_phone),
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: waivers
-- Multiple waivers per user with historical snapshots
-- ============================================================
CREATE TABLE waivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- Historical snapshot data (as it was at signing time)
  signer_name VARCHAR(200) COMMENT 'Full name at signing time',
  signer_email VARCHAR(255) COMMENT 'Email at signing time',
  signer_address VARCHAR(255) COMMENT 'Street address at signing time',
  signer_city VARCHAR(100) COMMENT 'City at signing time',
  signer_province VARCHAR(100) COMMENT 'Province at signing time',
  signer_postal VARCHAR(20) COMMENT 'Postal code at signing time',
  signer_dob DATE COMMENT 'Date of birth at signing time',
  minors_snapshot JSON COMMENT 'Array of minors included in this waiver',
  
  -- Waiver details
  signature_image LONGTEXT COMMENT 'Base64 encoded signature',
  signed_at TIMESTAMP NULL,
  rules_accepted TINYINT(1) DEFAULT 0,
  completed TINYINT(1) DEFAULT 0,
  
  -- Admin verification
  verified_by_staff TINYINT(1) DEFAULT 0 COMMENT '0=pending, 1=verified, 2=inaccurate',
  staff_id INT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_signed_at (signed_at),
  INDEX idx_completed (completed),
  INDEX idx_verified_by_staff (verified_by_staff)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: minors
-- Reusable minor profiles linked to users
-- ============================================================
CREATE TABLE minors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dob DATE,
  relationship VARCHAR(50) COMMENT 'parent, guardian, sibling, etc.',
  status TINYINT(1) DEFAULT 1 COMMENT '1=active, 0=inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTE: waiver_minors junction table removed
-- We use minors_snapshot JSON column in waivers table instead
-- This provides historical accuracy - each waiver stores the exact
-- minor data as it was at signing time
-- ============================================================

-- ============================================================
-- TABLE: otps
-- Temporary one-time passwords for phone verification
-- ============================================================
CREATE TABLE otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_phone (phone),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: staff
-- Admin and staff accounts with role-based access
-- ============================================================
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('staff', 'admin', 'superadmin') DEFAULT 'staff',
  profile_image VARCHAR(255),
  status TINYINT(1) DEFAULT 1 COMMENT '1=active, 0=inactive',
  reset_token VARCHAR(255),
  token_expiry TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: feedback
-- Customer ratings and feedback
-- ============================================================
CREATE TABLE feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  rating INT NOT NULL COMMENT 'Star rating 1-5',
  message TEXT,
  issue TEXT COMMENT 'Reported issue if any',
  staff_name VARCHAR(100) COMMENT 'Staff member who helped',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Insert default admin account (if needed)
-- Password: admin123 (hashed with bcrypt)
-- ============================================================
-- Uncomment the following line if you need a default admin account
-- INSERT INTO staff (name, email, password, role, status) 
-- VALUES ('Admin', 'admin@skateandplay.com', '$2b$10$XqGKlXJHvGK.XqGKlXJHvO4YrGKlXJHvGK.XqGKlXJHvGK', 'superadmin', 1);

-- ============================================================
-- Migration Complete
-- ============================================================
