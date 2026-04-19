const fs = require('fs');
const path = require('path');

// Load database connection from the app's db.js
const db = require('./db');

async function runMigration() {
  try {
    // Read the migration file
    const sql = fs.readFileSync('../create-pending-students-migration.sql', 'utf8');
    
    // Split into individual statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    console.log('✓ Using existing database connection\n');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing:`, preview + '...');
      
      try {
        await db.query(statement);
        console.log('✓ Success\n');
      } catch (err) {
        console.error('✗ Error:', err.message, '\n');
      }
    }
    
    console.log('✓ Migration completed');
    process.exit(0);
    
  } catch (err) {
    console.error('Error running migration:', err.message);
    process.exit(1);
  }
}

runMigration();
