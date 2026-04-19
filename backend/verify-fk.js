const db = require('./db');

(async () => {
  try {
    console.log('Checking current attendance table constraints...');
    
    // Check current foreign keys
    const [fks] = await db.execute(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'attendance' AND COLUMN_NAME = 'opportunity_id'
    `);
    
    console.log('Current constraints:', fks);
    
    if (fks.length > 0) {
      const fk = fks[0];
      console.log(`\nFound constraint: ${fk.CONSTRAINT_NAME}`);
      console.log(`Currently references: ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
      
      if (fk.REFERENCED_TABLE_NAME === 'opportunities') {
        console.log('\n⚠ Constraint still references opportunities. Fixing...');
        
        // Drop and recreate
        try {
          await db.execute(`ALTER TABLE attendance DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
          console.log('✓ Old constraint dropped');
        } catch (err) {
          console.log('Info:', err.message);
        }
        
        await db.execute('ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (opportunity_id) REFERENCES placements(id) ON DELETE CASCADE');
        console.log('✓ New constraint added (references placements)');
      } else {
        console.log('\n✓ Constraint is correct (references placements)');
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
