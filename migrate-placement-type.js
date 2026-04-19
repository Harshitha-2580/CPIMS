// Migration to update placement_type enum values
const db = require('./backend/db');

async function runMigration() {
  try {
    console.log('Starting migration to update placement_type enum...');
    
    // First, convert the column to VARCHAR temporarily to allow any values
    await db.query(`
      ALTER TABLE placements MODIFY COLUMN placement_type VARCHAR(50)
    `);
    console.log('✓ Converted placement_type column to VARCHAR temporarily');
    
    // Convert all old values to oncampus
    await db.query(`
      UPDATE placements SET placement_type = 'oncampus' WHERE placement_type IS NULL OR placement_type NOT IN ('oncampus', 'offcampus')
    `);
    console.log('✓ Converted old placement_type values to oncampus');
    
    // Now convert back to ENUM with new values
    await db.query(`
      ALTER TABLE placements MODIFY COLUMN placement_type ENUM('oncampus', 'offcampus') DEFAULT 'oncampus'
    `);
    console.log('✓ Updated placement_type enum to (oncampus, offcampus)');
    
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
