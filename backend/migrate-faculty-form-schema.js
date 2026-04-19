const db = require('./db');
const db2 = require('./db2');

async function migrateFacultySchema(connection, campusType, dbName) {
  await connection.query('SET FOREIGN_KEY_CHECKS=0');
  await connection.query('TRUNCATE TABLE faculty_password_resets');
  await connection.query('TRUNCATE TABLE faculty_auth');
  await connection.query('TRUNCATE TABLE faculty');
  await connection.query('SET FOREIGN_KEY_CHECKS=1');

  const [columns] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'faculty'`,
    [dbName]
  );

  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const dropCandidates = [
    'qualification',
    'profile_image',
    'is_active',
    'password',
    'password_reset_required',
    'last_active'
  ];

  for (const columnName of dropCandidates) {
    if (existingColumns.has(columnName)) {
      await connection.query(`ALTER TABLE faculty DROP COLUMN ${columnName}`);
    }
  }

  await connection.query('ALTER TABLE faculty MODIFY COLUMN faculty_id VARCHAR(20) NOT NULL');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN name VARCHAR(255) NOT NULL');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN email VARCHAR(255) NOT NULL');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN phone VARCHAR(20) NOT NULL');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN department VARCHAR(100) NOT NULL');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN designation VARCHAR(100) NOT NULL');
  await connection.query(`ALTER TABLE faculty MODIFY COLUMN campus_type VARCHAR(10) NOT NULL DEFAULT '${campusType}'`);
  await connection.query('ALTER TABLE faculty MODIFY COLUMN can_post_events TINYINT(1) NULL DEFAULT 0');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN can_upload_resources TINYINT(1) NULL DEFAULT 0');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN can_post_internships TINYINT(1) NULL DEFAULT 0');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN can_monitor_assigned_drives TINYINT(1) NULL DEFAULT 0');
  await connection.query('ALTER TABLE faculty MODIFY COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');

  const [afterColumns] = await connection.query('SHOW COLUMNS FROM faculty');
  const [[countRow]] = await connection.query('SELECT COUNT(*) AS total FROM faculty');

  console.log(`\n=== ${campusType} (${dbName}) ===`);
  console.log('rows after truncate:', countRow.total);
  console.table(
    afterColumns.map((column) => ({
      Field: column.Field,
      Type: column.Type,
      Null: column.Null,
      Key: column.Key,
      Default: column.Default,
      Extra: column.Extra
    }))
  );
}

(async () => {
  const necnDbName = process.env.DB_NAME || 'placement_portal2';
  const necgDbName = process.env.DB_NAME_NEW || 'placement_portal3';

  await migrateFacultySchema(db, 'NECN', necnDbName);
  await migrateFacultySchema(db2, 'NECG', necgDbName);

  process.exit(0);
})().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
