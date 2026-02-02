const db = require('./backend/db');

async function checkSchema() {
  try {
    const [internships] = await db.query('DESCRIBE internships');
    console.log('Internships table columns:');
    internships.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));

    const [placements] = await db.query('DESCRIBE placements');
    console.log('\nPlacements table columns:');
    placements.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkSchema();
