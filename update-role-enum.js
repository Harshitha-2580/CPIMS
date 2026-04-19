const db = require('./backend/db.js');

async function updateRoleEnum() {
  try {
    console.log('Updating role enum in admins table...\n');
    
    // Modify the role enum to include 'admin'
    await db.query(`ALTER TABLE admins MODIFY COLUMN role ENUM('super', 'admin', 'manager') DEFAULT 'admin'`);
    
    console.log('✅ Role enum updated successfully!');
    console.log('Valid roles now: super, admin, manager');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

updateRoleEnum();
