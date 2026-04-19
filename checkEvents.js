const db = require('./backend/db');
(async () => {
  try {
    // attempt migration
    try {
      await db.query("ALTER TABLE faculty_events ADD COLUMN eligible_branches VARCHAR(255) AFTER location");
      console.log('added eligible_branches');
    } catch(err) {
      console.log('eligible_branches already exists or error:', err.message);
    }
    try {
      await db.query("ALTER TABLE faculty_events ADD COLUMN eligible_years JSON AFTER eligible_branches");
      console.log('added eligible_years');
    } catch(err) {
      console.log('eligible_years already exists or error:', err.message);
    }
    // publish existing events
    const [result] = await db.query("UPDATE faculty_events SET status='published' WHERE status='draft'");
    console.log('published rows count', result.affectedRows);

    const [cols] = await db.query('SHOW COLUMNS FROM faculty_events');
    console.log('COLUMNS:', cols.map(c=>c.Field));
    const [rows] = await db.query('SELECT * FROM faculty_events');
    console.log('EVENT ROWS:', rows);
  } catch(e) {
    console.error('ERROR', e);
  }
  process.exit();
})();