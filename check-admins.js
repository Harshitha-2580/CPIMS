const db = require('./backend/db.js');

async function checkAdmins() {
  try {
    const [columns] = await db.query('DESCRIBE admins');
    console.log('=== Current Admins Table Structure ===');
    columns.forEach(col => console.log(`${col.Field}: ${col.Type}`));
    
    const [rows] = await db.query('SELECT * FROM admins');
    console.log('\n=== Current Admins Data ===');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkAdmins();
