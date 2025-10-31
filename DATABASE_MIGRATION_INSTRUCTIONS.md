# Database Migration Instructions: Old to New Schema

This guide will help you import your old database data into the new database structure.

## Prerequisites

1. Backup your current database before proceeding
2. Have access to both old and new database
3. SQL import file provided: `attached_assets/u742355347_waiver_1761924276629.sql`

## Migration Steps

### Step 1: Import Old Database to Temporary Location

First, import your old database SQL file to a separate database:

```bash
# Import the old database (replace credentials as needed)
mysql -u your_username -p -e "CREATE DATABASE IF NOT EXISTS old_database;"
mysql -u your_username -p old_database < attached_assets/u742355347_waiver_1761924276629.sql
```

### Step 2: Run the Migration Script

The migration script is located at: `backend/database/migrations/003_import_old_database.sql`

**Before running, update the script:**
- Replace all instances of `old_database` with the actual name of your old database

```bash
# Run the migration script
mysql -u your_username -p your_new_database < backend/database/migrations/003_import_old_database.sql
```

### Step 3: Verify the Migration

The migration script will output a summary showing:
- Total Users Imported
- Total Waivers Imported
- Total Minors Imported
- Total Feedback Imported
- Total Staff Imported
- Waivers with/without minors_snapshot

### What the Migration Does

#### 1. **Customers → Users**
- Maps all customer data to the users table
- Preserves all original IDs
- Converts date fields to proper DATE format
- Sets default country_code to '+1' if missing

#### 2. **Minors → Minors**
- Renames `customer_id` to `user_id`
- Preserves all minor data
- Maintains active/inactive status

#### 3. **Waiver_forms → Waivers (Most Complex)**
- Creates historical snapshots for each waiver
- Stores customer data as it was at signing time:
  - `signer_name`, `signer_email`, `signer_address`, etc.
- Creates `minors_snapshot` JSON with all minors included in that waiver
- Preserves signature images
- Maintains verification status and ratings

#### 4. **Feedback → Feedback**
- Imports all feedback data
- Links feedback to most recent waiver for each user
- Preserves ratings, messages, and issues

#### 5. **Staff → Staff**
- Direct copy (structure is the same)
- Preserves passwords (already hashed)
- Maintains roles and permissions

## Schema Differences Summary

| Old Schema | New Schema | Changes |
|------------|------------|---------|
| `customers` table | `users` table | Renamed for clarity |
| `waiver_forms` table | `waivers` table | Added snapshot columns for historical data |
| `minors.customer_id` | `minors.user_id` | Foreign key renamed |
| No snapshot data | Snapshot columns in waivers | Historical accuracy for each waiver |
| Signature in customers | Signature in waivers | Moved to waiver-specific data |

## New Database Features

### Historical Snapshots
Each waiver now stores a complete snapshot of customer data at the time of signing:
- Customer information (name, email, address, etc.)
- List of minors included in that specific waiver (JSON format)

This means:
- You can view waiver exactly as it was signed
- Customer can update their information without affecting historical waivers
- Minors can be added/removed without changing past waivers

### JSON Minors Snapshot Example
```json
[
  {
    "first_name": "Keiron",
    "last_name": "Grewal",
    "dob": "2013-11-04"
  },
  {
    "first_name": "Another",
    "last_name": "Minor",
    "dob": "2015-06-15"
  }
]
```

## Troubleshooting

### Common Issues:

1. **"Table doesn't exist" error**
   - Make sure you've created the new schema first using `backend/database/migrations/002_complete_redesign.sql`

2. **"Duplicate entry" error**
   - The script uses `ON DUPLICATE KEY UPDATE` to handle this
   - If it persists, there may be conflicting IDs between databases

3. **Missing minors_snapshot**
   - Some waivers may not have minor data if:
     - No minors were associated with that customer
     - Minors were created after the waiver
   - This is expected and normal

4. **Date format errors**
   - The script converts VARCHAR dates to DATE format
   - Invalid dates will be set to NULL

## Verification Queries

After migration, run these queries to verify data integrity:

```sql
-- Check user count matches
SELECT COUNT(*) FROM users;

-- Check waivers have proper snapshots
SELECT 
  id,
  signer_name,
  signed_at,
  minors_snapshot IS NOT NULL as has_minors_snapshot
FROM waivers
LIMIT 10;

-- Check minors are linked correctly
SELECT 
  m.id,
  m.first_name,
  m.last_name,
  u.first_name as parent_first_name,
  u.last_name as parent_last_name
FROM minors m
JOIN users u ON m.user_id = u.id
LIMIT 10;

-- Check feedback has waiver links
SELECT 
  f.id,
  f.user_id,
  f.waiver_id,
  f.rating,
  u.first_name,
  u.last_name
FROM feedback f
JOIN users u ON f.user_id = u.id
LIMIT 10;
```

## Important Notes

1. **Backup First**: Always backup both databases before migration
2. **Test Environment**: Run migration on development database first
3. **Snapshot Accuracy**: The minors_snapshot is created based on minors that existed at waiver creation time
4. **Auto-increment IDs**: The script automatically updates AUTO_INCREMENT values to prevent conflicts
5. **ON DUPLICATE KEY**: Script can be run multiple times safely (updates existing records)

## Need Help?

If you encounter issues:
1. Check the MySQL error log for detailed error messages
2. Verify the old database name in the migration script
3. Ensure the new schema exists before running migration
4. Contact support with the specific error message

---

**Migration Status:** Ready to execute
**Script Location:** `backend/database/migrations/003_import_old_database.sql`
**Estimated Time:** 1-5 minutes depending on data volume
