const db = require('./backend/db.js');

async function fixAdminPrivileges() {
  try {
    console.log('Fixing admin privileges...\n');
    
    // Add can_manage_admins column if it doesn't exist
    console.log('Adding can_manage_admins column to admins table...');
    try {
      await db.query('ALTER TABLE admins ADD COLUMN can_manage_admins TINYINT(1) DEFAULT 0');
      console.log('✅ can_manage_admins column added');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  can_manage_admins column already exists');
      } else {
        throw err;
      }
    }
    
    // Grant can_manage_admins to all superadmins
    console.log('Granting can_manage_admins to all superadmins...');
    const [result1] = await db.query('UPDATE admins SET can_manage_admins = 1 WHERE role IN ("super", "superadmin")');
    console.log(`✅ Updated ${result1.affectedRows} superadmin(s)`);
    
    // Verify the changes
    console.log('\n=== Admins Table Verification ===');
    const [admins] = await db.query('SELECT id, name, email, role, can_manage_admins, can_approve_students FROM admins');
    console.log(JSON.stringify(admins, null, 2));
    
    console.log('\n✅ Admin privileges fixed successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

fixAdminPrivileges();
