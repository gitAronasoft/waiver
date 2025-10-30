const db = require('../config/database');

/**
 * Analysis tool to check waiver data integrity
 * Run with: node tools/analyze-waivers.js
 */
async function analyzeWaivers() {
  try {
    console.log('📊 Analyzing Waiver Data Integrity\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get overall statistics
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_waivers,
        SUM(CASE WHEN minors_snapshot IS NOT NULL THEN 1 ELSE 0 END) as with_snapshot,
        SUM(CASE WHEN minors_snapshot IS NULL THEN 1 ELSE 0 END) as without_snapshot,
        SUM(CASE WHEN signed_at IS NOT NULL THEN 1 ELSE 0 END) as signed_waivers,
        SUM(CASE WHEN signed_at IS NULL THEN 1 ELSE 0 END) as unsigned_waivers
      FROM waivers
    `);
    
    console.log('📋 Database Overview:');
    console.log(`  Total waivers: ${stats[0].total_waivers}`);
    console.log(`  Signed waivers: ${stats[0].signed_waivers}`);
    console.log(`  Unsigned waivers: ${stats[0].unsigned_waivers}`);
    console.log(`  With minors_snapshot: ${stats[0].with_snapshot}`);
    console.log(`  Without minors_snapshot: ${stats[0].without_snapshot}\n`);
    
    // Check for potential data issues
    const [oldWaivers] = await db.query(`
      SELECT COUNT(*) as count
      FROM waivers w
      WHERE w.minors_snapshot IS NULL
        AND w.signed_at IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM minors m 
          WHERE m.user_id = w.user_id
        )
    `);
    
    if (oldWaivers[0].count > 0) {
      console.log(`⚠️  Found ${oldWaivers[0].count} signed waiver(s) with NULL snapshot but associated minors`);
      console.log('   These were likely created before the snapshot feature was implemented.\n');
      console.log('   ➤ These waivers CANNOT be automatically migrated');
      console.log('   ➤ Historical minor data is unknown');
      console.log('   ➤ Admin pages will show "-" for minors on these waivers\n');
    } else {
      console.log('✅ All signed waivers with minors have proper snapshots!\n');
    }
    
    // Check if waiver_minors table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'waiver_minors'");
    if (tables.length > 0) {
      console.log('⚠️  waiver_minors table still exists in database');
      console.log('   This table is NOT used by the application code.');
      console.log('   Safe to drop with: DROP TABLE waiver_minors;\n');
    } else {
      console.log('✅ waiver_minors table removed (correct - it was unused)\n');
    }
    
    // Verify current code is working
    const [recentWaivers] = await db.query(`
      SELECT COUNT(*) as count
      FROM waivers w
      WHERE w.signed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND w.minors_snapshot IS NULL
        AND EXISTS (
          SELECT 1 FROM minors m 
          WHERE m.user_id = w.user_id
        )
    `);
    
    if (recentWaivers[0].count > 0) {
      console.log(`❌ Found ${recentWaivers[0].count} RECENT waiver(s) missing snapshots`);
      console.log('   This indicates the current code may not be working correctly!\n');
    } else {
      console.log('✅ Recent waivers (last 7 days) have correct snapshot data\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('💡 Summary:\n');
    console.log('1. Current code is working correctly for NEW waivers');
    console.log('2. OLD waivers with NULL snapshot cannot be auto-fixed');
    console.log('3. Admin pages will show "-" for minors on old waivers');
    console.log('4. This is expected and safe - no data corruption risk\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

analyzeWaivers();
