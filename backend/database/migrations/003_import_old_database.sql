-- ============================================================================
-- Migration Script: Import Old Database to New Schema
-- ============================================================================
-- This script maps data from the old database structure to the new schema
-- 
-- OLD SCHEMA TABLES:
-- - customers (id, first_name, last_name, middle_initial, email, dob, age, address, 
--             city, province, postal_code, country_code, home_phone, cell_phone, 
--             work_phone, can_email, signature, status, created_at, updated_at)
-- - waiver_forms (id, user_id, signed_at, staff_id, signature_image, rules_accepted, 
--                completed, verified_by_staff, rating_email_sent, rating_sms_sent, created_at)
-- - minors (id, customer_id, first_name, last_name, dob, status, created_at)
-- - feedback (id, user_id, rating, message, issue, staff_name, created_at)
-- - otps (id, phone, otp, expires_at, created_at)
-- - staff (id, name, email, password, role, status, profile_image, created_at, updated_at)
--
-- NEW SCHEMA TABLES:
-- - users (replaces customers)
-- - waivers (replaces waiver_forms with snapshot data)
-- - minors (restructured with user_id instead of customer_id)
-- - feedback (same structure with waiver_id added)
-- - otps (same structure)
-- - staff (same structure)
-- ============================================================================

-- ============================================================================
-- STEP 1: Import Customers into Users Table
-- ============================================================================
-- Map old customers table to new users table
-- NOTE: You need to replace 'old_database' with the actual name of your old database

INSERT INTO users (
  id,
  first_name,
  last_name,
  email,
  dob,
  address,
  city,
  province,
  postal_code,
  country_code,
  cell_phone,
  home_phone,
  work_phone,
  can_email,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  COALESCE(first_name, '') as first_name,
  COALESCE(last_name, '') as last_name,
  email,
  CASE 
    WHEN dob IS NULL OR dob = '' THEN NULL
    ELSE STR_TO_DATE(dob, '%Y-%m-%d')
  END as dob,
  address,
  city,
  province,
  postal_code,
  COALESCE(country_code, '+1') as country_code,
  cell_phone,
  home_phone,
  work_phone,
  COALESCE(can_email, 0) as can_email,
  COALESCE(status, 1) as status,
  created_at,
  updated_at
FROM old_database.customers
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  email = VALUES(email),
  dob = VALUES(dob),
  address = VALUES(address),
  city = VALUES(city),
  province = VALUES(province),
  postal_code = VALUES(postal_code),
  country_code = VALUES(country_code),
  home_phone = VALUES(home_phone),
  work_phone = VALUES(work_phone),
  can_email = VALUES(can_email),
  updated_at = VALUES(updated_at);

-- ============================================================================
-- STEP 2: Import Minors
-- ============================================================================
-- Map old minors table to new minors table
-- customer_id is renamed to user_id

INSERT INTO minors (
  id,
  user_id,
  first_name,
  last_name,
  dob,
  status,
  created_at
)
SELECT 
  id,
  customer_id as user_id,
  first_name,
  last_name,
  CASE 
    WHEN dob IS NULL OR dob = '' THEN NULL
    ELSE STR_TO_DATE(dob, '%Y-%m-%d')
  END as dob,
  COALESCE(status, 1) as status,
  created_at
FROM old_database.minors
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  dob = VALUES(dob),
  status = VALUES(status);

-- ============================================================================
-- STEP 3: Import Waivers with Snapshot Data
-- ============================================================================
-- This is the most complex migration because we need to:
-- 1. Get customer data from old customers table
-- 2. Get minors that were included in each waiver
-- 3. Create snapshot JSON for minors

INSERT INTO waivers (
  id,
  user_id,
  signer_name,
  signer_email,
  signer_address,
  signer_city,
  signer_province,
  signer_postal,
  signer_dob,
  minors_snapshot,
  signature_image,
  signed_at,
  rules_accepted,
  completed,
  verified_by_staff,
  staff_id,
  rating_email_sent,
  rating_sms_sent,
  created_at
)
SELECT 
  w.id,
  w.user_id,
  CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as signer_name,
  c.email as signer_email,
  c.address as signer_address,
  c.city as signer_city,
  c.province as signer_province,
  c.postal_code as signer_postal,
  CASE 
    WHEN c.dob IS NULL OR c.dob = '' THEN NULL
    ELSE STR_TO_DATE(c.dob, '%Y-%m-%d')
  END as signer_dob,
  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'first_name', m.first_name,
        'last_name', m.last_name,
        'dob', m.dob
      )
    )
    FROM old_database.minors m
    WHERE m.customer_id = w.user_id
      AND m.status = 1
      AND m.created_at <= w.created_at
  ) as minors_snapshot,
  COALESCE(w.signature_image, c.signature) as signature_image,
  w.signed_at,
  COALESCE(w.rules_accepted, 0) as rules_accepted,
  COALESCE(w.completed, 0) as completed,
  COALESCE(w.verified_by_staff, 0) as verified_by_staff,
  COALESCE(w.staff_id, 0) as staff_id,
  COALESCE(w.rating_email_sent, 0) as rating_email_sent,
  COALESCE(w.rating_sms_sent, 0) as rating_sms_sent,
  w.created_at
FROM old_database.waiver_forms w
LEFT JOIN old_database.customers c ON w.user_id = c.id
ON DUPLICATE KEY UPDATE
  signer_name = VALUES(signer_name),
  signer_email = VALUES(signer_email),
  signer_address = VALUES(signer_address),
  signer_city = VALUES(signer_city),
  signer_province = VALUES(signer_province),
  signer_postal = VALUES(signer_postal),
  signer_dob = VALUES(signer_dob),
  minors_snapshot = VALUES(minors_snapshot),
  signature_image = VALUES(signature_image),
  signed_at = VALUES(signed_at),
  rules_accepted = VALUES(rules_accepted),
  completed = VALUES(completed),
  verified_by_staff = VALUES(verified_by_staff);

-- ============================================================================
-- STEP 4: Import Feedback
-- ============================================================================
-- Feedback structure is similar, just need to add waiver_id mapping

INSERT INTO feedback (
  id,
  user_id,
  waiver_id,
  rating,
  message,
  issue,
  staff_name,
  created_at
)
SELECT 
  f.id,
  f.user_id,
  (
    SELECT w.id 
    FROM old_database.waiver_forms w 
    WHERE w.user_id = f.user_id 
    ORDER BY w.created_at DESC 
    LIMIT 1
  ) as waiver_id,
  f.rating,
  f.message,
  f.issue,
  f.staff_name,
  f.created_at
FROM old_database.feedback f
ON DUPLICATE KEY UPDATE
  rating = VALUES(rating),
  message = VALUES(message),
  issue = VALUES(issue),
  staff_name = VALUES(staff_name);

-- ============================================================================
-- STEP 5: Import Staff (if needed)
-- ============================================================================
-- Staff table structure is the same

INSERT INTO staff (
  id,
  name,
  email,
  password,
  role,
  status,
  profile_image,
  created_at,
  updated_at
)
SELECT 
  id,
  name,
  email,
  password,
  role,
  COALESCE(status, 1) as status,
  COALESCE(profile_image, '') as profile_image,
  created_at,
  updated_at
FROM old_database.staff
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  password = VALUES(password),
  role = VALUES(role),
  status = VALUES(status),
  profile_image = VALUES(profile_image),
  updated_at = VALUES(updated_at);

-- ============================================================================
-- STEP 6: Clean up and verify
-- ============================================================================

-- Update auto_increment values to avoid ID conflicts
SELECT @max_user_id := COALESCE(MAX(id), 0) + 1 FROM users;
SET @alter_users = CONCAT('ALTER TABLE users AUTO_INCREMENT = ', @max_user_id);
PREPARE stmt FROM @alter_users;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT @max_waiver_id := COALESCE(MAX(id), 0) + 1 FROM waivers;
SET @alter_waivers = CONCAT('ALTER TABLE waivers AUTO_INCREMENT = ', @max_waiver_id);
PREPARE stmt FROM @alter_waivers;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT @max_minor_id := COALESCE(MAX(id), 0) + 1 FROM minors;
SET @alter_minors = CONCAT('ALTER TABLE minors AUTO_INCREMENT = ', @max_minor_id);
PREPARE stmt FROM @alter_minors;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT @max_feedback_id := COALESCE(MAX(id), 0) + 1 FROM feedback;
SET @alter_feedback = CONCAT('ALTER TABLE feedback AUTO_INCREMENT = ', @max_feedback_id);
PREPARE stmt FROM @alter_feedback;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT @max_staff_id := COALESCE(MAX(id), 0) + 1 FROM staff;
SET @alter_staff = CONCAT('ALTER TABLE staff AUTO_INCREMENT = ', @max_staff_id);
PREPARE stmt FROM @alter_staff;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification queries
SELECT 'Migration Summary' as '';
SELECT COUNT(*) as 'Total Users Imported' FROM users;
SELECT COUNT(*) as 'Total Waivers Imported' FROM waivers;
SELECT COUNT(*) as 'Total Minors Imported' FROM minors;
SELECT COUNT(*) as 'Total Feedback Imported' FROM feedback;
SELECT COUNT(*) as 'Total Staff Imported' FROM staff;

SELECT 'Waivers with snapshots' as '';
SELECT COUNT(*) as 'Waivers with minors_snapshot' FROM waivers WHERE minors_snapshot IS NOT NULL;
SELECT COUNT(*) as 'Waivers without minors_snapshot' FROM waivers WHERE minors_snapshot IS NULL;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Replace 'old_database' with your actual old database name
-- 2. This script uses ON DUPLICATE KEY UPDATE to avoid errors if run multiple times
-- 3. The minors_snapshot creation is a best-effort based on minors created before the waiver
-- 4. For more accurate minor snapshots, you may need to manually verify some waivers
-- 5. Make sure to backup both databases before running this migration
-- 6. Test on a development database first
-- ============================================================================
