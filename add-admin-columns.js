const db = require('./backend/db.js');

async function addMissingColumns() {
  try {
    console.log('Checking admins table for missing columns...\n');
    
    const [columns] = await db.query('DESCRIBE admins');
    const existingColumns = columns.map(col => col.Field);
    console.log('Existing columns:', existingColumns);
    
    const requiredColumns = [
      { name: 'phone', type: 'varchar(20)' },
      { name: 'designation', type: 'varchar(100)' }
    ];
    
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`\nAdding column: ${col.name} (${col.type})`);
        await db.query(`ALTER TABLE admins ADD COLUMN ${col.name} ${col.type} DEFAULT NULL`);
        console.log(`✅ Column ${col.name} added successfully`);
      } else {
        console.log(`✅ Column ${col.name} already exists`);
      }
    }
    
    // Verify final structure
    const [finalColumns] = await db.query('DESCRIBE admins');
    console.log('\nFinal admins table structure:');
    finalColumns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));
    
    console.log('\n✅ All columns are present!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

addMissingColumns();
