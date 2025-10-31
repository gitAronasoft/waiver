const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Starting rating tokens migration...\n');
    
    // Read the migration SQL file
    const sqlFile = path.join(__dirname, 'database/migrations/003_rating_tokens_system.sql');
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
        // Extract action for logging
        let action = 'Executing statement';
        if (statement.includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/);
          if (match) action = `Creating table: ${match[1]}`;
        } else if (statement.includes('ALTER TABLE')) {
          const match = statement.match(/ALTER TABLE (\w+)/);
          if (match) action = `Altering table: ${match[1]}`;
        }
        
        console.log(`  ${i + 1}. ${action}`);
        await db.query(statement);
        console.log(`  ✅ Success\n`);
      } catch (error) {
        console.error(`  ❌ Error executing statement ${i + 1}:`);
        console.error(`  First 200 chars: ${statement.substring(0, 200)}...`);
        console.error(`  Error: ${error.message}\n`);
        
        // Some errors are expected (like column already exists), continue
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists')) {
          console.log(`  ℹ️  Column/constraint already exists, continuing...\n`);
        }
      }
    }
    
    console.log('✅ Rating tokens migration completed!\n');
    console.log('📊 Verifying tables...');
    
    // Verify tables
    const [tables] = await db.query('SHOW TABLES');
    console.log('\n📋 Database tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });
    
    // Verify rating_tokens table structure
    try {
      const [columns] = await db.query('DESCRIBE rating_tokens');
      console.log('\n📋 rating_tokens table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.error('Could not describe rating_tokens table:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
