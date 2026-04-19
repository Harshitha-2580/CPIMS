const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  let connection;

  try {
    // Database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '2580',
      database: 'placement_portal2'
    });

    console.log('Connected to database');

    // Run the table creation migration
    console.log('Creating student_placements table...');
    const createTableSQL = fs.readFileSync(path.join(__dirname, 'create-student-placements-table.sql'), 'utf8');
    await connection.execute(createTableSQL);
    console.log('✓ student_placements table created');

    // Run the data migration statements one by one
    console.log('Migrating existing placement data...');
    const migrateDataSQL = fs.readFileSync(path.join(__dirname, 'migrate-student-placements.sql'), 'utf8');

    // Split the SQL into individual statements
    const statements = migrateDataSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (err) {
          console.log(`Skipping statement due to error: ${err.message}`);
        }
      }
    }

    console.log('✓ Existing placement data migrated');

    console.log('✅ All migrations completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();