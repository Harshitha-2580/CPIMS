const db = require('./db');

(async () => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      ['placements', 'interview_rounds']
    );

    if (rows[0].cnt === 0) {
      await db.query('ALTER TABLE placements ADD COLUMN interview_rounds TEXT NULL AFTER placement_type');
      console.log('Added interview_rounds TEXT column');
    } else {
      console.log('interview_rounds column already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
