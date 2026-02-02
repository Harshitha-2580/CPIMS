const db = require('./db');

(async () => {
  try {
    const [cols] = await db.query('DESCRIBE assignments');
    console.log('=== ASSIGNMENTS TABLE ===');
    cols.forEach(c => console.log(c.Field + ' (' + c.Type + ')'));
  } catch(err) {
    console.log('Table assignments does not exist. Creating it...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        opportunity_id INT NOT NULL,
        opportunity_type VARCHAR(20) NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'
      )
    `);
    console.log('✅ Assignments table created');
  }
  process.exit(0);
})();
