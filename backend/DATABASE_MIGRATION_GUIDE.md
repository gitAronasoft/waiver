# Database Fix Guide - waiver_minors Table Issue

## Problem Summary

The database schema included a `waiver_minors` junction table that was **never used** by the application code. All code uses the `minors_snapshot` JSON column instead. This caused confusion about missing data.

## What Was Fixed

### 1. Removed Unused Table
- **Removed `waiver_minors`** from schema (lines 107-121 in 002_complete_redesign.sql)
- This table was dead code - no application logic ever used it
- Safe to drop from your remote database

### 2. Verified Code Works Correctly
- All APIs properly use `minors_snapshot` JSON column
- Frontend pages correctly display minor data from API responses
- New waivers created going forward will work perfectly

## How the App Actually Works

The app uses a **snapshot pattern**:

- `minors` table = Current minor profiles (can be edited/updated)
- `minors_snapshot` JSON = Historical snapshot frozen at waiver signing time
- Each waiver stores exact minor data as it existed when signed

**Example Flow:**
1. User creates waiver → minors inserted into `minors` table
2. User signs waiver → `minors_snapshot` JSON created from current minors
3. Later, user updates minor info → `minors` table updates, but old waiver snapshot stays unchanged
4. Admin views waiver → Shows minors from snapshot (historical accuracy)

## What About Old Waivers?

### The Limitation

**Old waivers with NULL `minors_snapshot` CANNOT be automatically migrated.**

Why? We don't know which minors were actually part of each historical waiver:
- Some waivers were adult-only (no minors)
- Some families signed for 1-2 minors (not all)
- Automatic migration would fabricate incorrect data

### What This Means

- Old waivers with NULL snapshot will show "-" in admin pages
- **This is correct and safe** - we're not showing fake data
- New waivers work perfectly
- No data corruption risk

## Migration Steps for Remote MySQL Database

### Step 1: Backup Your Database (CRITICAL!)

```bash
mysqldump -u your_user -p your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Remove waiver_minors Table

```sql
-- Connect to your remote MySQL database
DROP TABLE IF EXISTS waiver_minors;
```

This is safe because no code uses this table.

### Step 3: Analyze Your Data

```bash
cd backend
node tools/analyze-waivers.js
```

This will show you:
- How many waivers have proper snapshots
- How many old waivers have NULL snapshots
- Whether recent waivers are working correctly
- If waiver_minors table still exists

### Step 4: Test the Application

1. Create a NEW waiver with minors and sign it
2. Verify it appears in admin pages with minor names
3. Check that History page shows minors correctly
4. Confirm Home page displays minor data

## Database Schema

```
users (one per phone number)
├── minors (current/editable profiles)
└── waivers (multiple per user)
    ├── signer_* columns (snapshot at signing)
    └── minors_snapshot (JSON - frozen at signing)

otps, staff, feedback
```

### minors_snapshot Format

```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "dob": "2010-05-15"
  }
]
```

## API Endpoints

All correctly use `minors_snapshot`:
- `POST /api/waivers/save-signature` - Creates snapshot when signing
- `GET /api/waivers/getAllCustomers` - Reads from snapshot
- `GET /api/waivers/getallwaivers` - Reads from snapshot
- `GET /api/waivers/waiver-details/:id` - Reads from snapshot

## Troubleshooting

### Old waivers show "-" for minors

**This is expected!** Old waivers created before snapshot feature have NULL data. We cannot reliably backfill this. New waivers work correctly.

### NEW waivers missing minors

Run analysis tool:
```bash
node tools/analyze-waivers.js
```

If recent waivers (last 7 days) show missing snapshots, check:
1. Server logs for errors
2. Browser console for API failures
3. Database connection settings

### waiver_minors table still exists

Safe to drop:
```sql
DROP TABLE IF EXISTS waiver_minors;
```

## Summary

✅ **What works:**
- New waivers capture minors correctly
- Admin pages display minor data
- Historical accuracy maintained via snapshots
- No data corruption risk

⚠️ **Known limitation:**
- Old waivers with NULL snapshot show "-" for minors
- This cannot be auto-fixed without risking false data
- This is acceptable - going forward everything works
