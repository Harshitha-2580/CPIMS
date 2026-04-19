const db = require('./db');
(async () => {
  try {
    const [a] = await db.query('SELECT * FROM student_registrations');
    console.log('student_registrations', a);
    const [p] = await db.query('SELECT * FROM placements');
    console.log('placements', p);
    const [o] = await db.query('SELECT * FROM opportunities');
    console.log('opportunities', o);
  } catch (err) {
    console.error('ERR', err);
  } finally {
    process.exit(0);
  }
})();