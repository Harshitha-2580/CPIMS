const db = require('./backend/db.js');

async function updateAdminPrivileges() {
  try {
    console.log('Starting privilege migration...\n');
    
    // Check if columns exist before adding
    const [columns] = await db.query('DESCRIBE admins');
    const existingColumns = columns.map(col => col.Field);
    
    const privilegeColumns = [
      'can_add_faculty',
      'can_generate_reports', 
      'can_post_opportunities',
      'can_assign_students_opportunities',
      'can_approve_students'
    ];
    
    // Add missing privilege columns
    for (const col of privilegeColumns) {
      if (!existingColumns.includes(col)) {
        console.log(`Adding column: ${col}`);
        await db.query(`ALTER TABLE admins ADD COLUMN ${col} TINYINT(1) DEFAULT 0`);
      } else {
        console.log(`Column ${col} already exists`);
      }
    }
    
    // Set all privileges to 1 for admin@example.com
    console.log('\nSetting all privileges to 1 for admin@example.com...');
    const updateQuery = `UPDATE admins SET 
      can_add_faculty = 1,
      can_generate_reports = 1,
      can_post_opportunities = 1,
      can_assign_students_opportunities = 1,
      can_approve_students = 1
      WHERE email = 'admin@example.com'`;
    
    const [result] = await db.query(updateQuery);
    console.log(`Updated ${result.affectedRows} row(s)\n`);
    
    // Verify the changes
    console.log('=== Updated Admins Data ===');
    const [updatedRows] = await db.query('SELECT * FROM admins WHERE email = "admin@example.com"');
    console.log(JSON.stringify(updatedRows, null, 2));
    
    console.log('\n✅ Privileges successfully set for superadmin!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

updateAdminPrivileges();
