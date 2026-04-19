const db = require('./backend/db.js');

async function addResetTokenColumn() {
  try {
    console.log('Adding password reset token column to admins table...\n');
    
    const [columns] = await db.query('DESCRIBE admins');
    const existingColumns = columns.map(col => col.Field);
    
    if (!existingColumns.includes('password_reset_token')) {
      await db.query(`ALTER TABLE admins ADD COLUMN password_reset_token VARCHAR(255) DEFAULT NULL`);
      console.log('✅ Column password_reset_token added');
    } else {
      console.log('✅ Column password_reset_token already exists');
    }
    
    if (!existingColumns.includes('password_reset_expires')) {
      await db.query(`ALTER TABLE admins ADD COLUMN password_reset_expires DATETIME DEFAULT NULL`);
      console.log('✅ Column password_reset_expires added');
    } else {
      console.log('✅ Column password_reset_expires already exists');
    }
    
    console.log('\n✅ All columns added successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

addResetTokenColumn();
