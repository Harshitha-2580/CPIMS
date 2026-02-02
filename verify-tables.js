const db = require('./backend/db');

async function verifyTables() {
  try {
    console.log('Verifying table structures...\n');
    
    console.log('=== ASSIGNMENTS_INTERNSHIPS TABLE ===');
    const [internships] = await db.query('DESCRIBE assignments_internships');
    internships.forEach(col => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n=== ASSIGNMENTS_DRIVES TABLE ===');
    const [drives] = await db.query('DESCRIBE assignments_drives');
    drives.forEach(col => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n✅ Verification complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifyTables();
