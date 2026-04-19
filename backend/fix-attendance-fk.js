const db = require('./db');

(async () => {
  try {
    console.log('Fixing attendance table foreign key constraint...');
    
    // First, drop the old constraint
    try {
      await db.execute('ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_2');
      console.log('Old constraint dropped');
    } catch (err) {
      console.log('Note: Old constraint already dropped or does not exist');
    }
    
    // Now add the correct constraint referencing placements
    await db.execute('ALTER TABLE attendance ADD CONSTRAINT attendance_ibfk_2 FOREIGN KEY (opportunity_id) REFERENCES placements(id) ON DELETE CASCADE');
    console.log('✓ Foreign key constraint fixed successfully!');
    console.log('attendance.opportunity_id now correctly references placements.id');
    
    process.exit(0);
  } catch (err) {
    console.error('✗ Error fixing constraint:', err.message);
    process.exit(1);
  }
})();
