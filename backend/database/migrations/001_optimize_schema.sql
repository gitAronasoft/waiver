-- Migration: Optimize database schema for multi-customer per phone flow
-- Date: October 28, 2025
-- Description: Adds performance indexes, foreign keys, and waiver_minors junction table

-- ============================================================================
-- STEP 1: Add Performance Indexes
-- ============================================================================

-- Add index on customers.cell_phone for fast phone number lookups
-- This is critical since we'll now have multiple customers with the same phone
CREATE INDEX IF NOT EXISTS idx_customers_cell_phone ON customers(cell_phone);

-- Add index on waiver_forms.customer_id for fast waiver retrieval
CREATE INDEX IF NOT EXISTS idx_waiver_forms_customer_id ON waiver_forms(customer_id);

-- Add composite index on waiver_forms for customer history queries
CREATE INDEX IF NOT EXISTS idx_waiver_forms_customer_created ON waiver_forms(customer_id, created_at DESC);

-- Add index on minors.customer_id for fast minor retrieval
CREATE INDEX IF NOT EXISTS idx_minors_customer_id ON minors(customer_id);

-- ============================================================================
-- STEP 2: Create waiver_minors Junction Table
-- ============================================================================

-- This table links specific minors to specific waivers
-- Allows tracking which minors were included in each visit
CREATE TABLE IF NOT EXISTS waiver_minors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  waiver_id BIGINT NOT NULL COMMENT 'FK to waiver_forms.id',
  minor_id BIGINT NOT NULL COMMENT 'FK to minors.id',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate entries
  UNIQUE KEY unique_waiver_minor (waiver_id, minor_id),
  
  -- Indexes for fast lookups
  INDEX idx_waiver_minors_waiver_id (waiver_id),
  INDEX idx_waiver_minors_minor_id (minor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Junction table linking waivers to minors for each visit';

-- ============================================================================
-- STEP 3: Add Foreign Key Constraints
-- ============================================================================

-- Add foreign key from waiver_forms to customers
-- ON DELETE CASCADE: If customer is deleted, delete their waivers
ALTER TABLE waiver_forms
ADD CONSTRAINT fk_waiver_forms_customer_id
FOREIGN KEY (customer_id) REFERENCES customers(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add foreign key from minors to customers
-- ON DELETE CASCADE: If customer is deleted, delete their minors
ALTER TABLE minors
ADD CONSTRAINT fk_minors_customer_id
FOREIGN KEY (customer_id) REFERENCES customers(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add foreign key from waiver_minors to waiver_forms
-- ON DELETE CASCADE: If waiver is deleted, remove junction records
ALTER TABLE waiver_minors
ADD CONSTRAINT fk_waiver_minors_waiver_id
FOREIGN KEY (waiver_id) REFERENCES waiver_forms(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add foreign key from waiver_minors to minors
-- ON DELETE CASCADE: If minor is deleted, remove junction records
ALTER TABLE waiver_minors
ADD CONSTRAINT fk_waiver_minors_minor_id
FOREIGN KEY (minor_id) REFERENCES minors(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add foreign key from feedback to customers
-- ON DELETE SET NULL: If customer is deleted, keep feedback but remove user_id reference
ALTER TABLE feedback
ADD CONSTRAINT fk_feedback_user_id
FOREIGN KEY (user_id) REFERENCES customers(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify indexes were created:
-- SHOW INDEX FROM customers WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM waiver_forms WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM minors WHERE Key_name LIKE 'idx_%';
-- SHOW INDEX FROM waiver_minors;

-- To verify foreign keys were created:
-- SELECT 
--   TABLE_NAME,
--   COLUMN_NAME,
--   CONSTRAINT_NAME,
--   REFERENCED_TABLE_NAME,
--   REFERENCED_COLUMN_NAME
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
-- WHERE TABLE_SCHEMA = 'u742355347_waiver_replit'
-- AND REFERENCED_TABLE_NAME IS NOT NULL
-- ORDER BY TABLE_NAME;
