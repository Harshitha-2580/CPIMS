const db = require('./backend/db');

async function fixSchema() {
  try {
    console.log('Checking table structure...');
    
    // Check internships table
    const [internships] = await db.query('DESCRIBE internships');
    console.log('\nInternships columns:');
    internships.forEach(col => console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'}`));
    
    // Check if start_date exists
    const hasStartDate = internships.some(col => col.Field === 'start_date');
    
    if (hasStartDate) {
      console.log('\n⚠️  start_date column found in internships table!');
      console.log('Attempting to modify column to allow NULL...');
      
      // Make start_date nullable
      await db.query('ALTER TABLE internships MODIFY COLUMN start_date DATE NULL');
      console.log('✅ Modified start_date to allow NULL');
    } else {
      console.log('\n✅ start_date not found - no changes needed for internships');
    }
    
    // Check placements table
    const [placements] = await db.query('DESCRIBE placements');
    console.log('\nPlacements columns:');
    placements.forEach(col => console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixSchema();
