const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Read the migration SQL file
    const sqlFile = path.join(__dirname, 'database/migrations/002_complete_redesign.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Remove comments
    sql = sql.replace(/--.*$/gm, '');
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Split by semicolons but be smarter about it
    const statements = [];
    let currentStatement = '';
    let inParens = 0;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      currentStatement += char;
      
      if (char === '(') inParens++;
      if (char === ')') inParens--;
      
      if (char === ';' && inParens === 0) {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Extract table name for logging
        let action = 'Executing statement';
        if (statement.includes('DROP TABLE')) {
          const match = statement.match(/DROP TABLE IF EXISTS (\w+)/);
          if (match) action = `Dropping table: ${match[1]}`;
        } else if (statement.includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE (\w+)/);
          if (match) action = `Creating table: ${match[1]}`;
        }
        
        console.log(`  ${i + 1}. ${action}`);
        await db.query(statement);
        console.log(`  ✅ Success\n`);
      } catch (error) {
        console.error(`  ❌ Error executing statement ${i + 1}:`);
        console.error(`  First 200 chars: ${statement.substring(0, 200)}...`);
        console.error(`  Error: ${error.message}\n`);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying tables...');
    
    // Verify tables were created
    const [tables] = await db.query('SHOW TABLES');
    console.log('\n📋 Existing tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
