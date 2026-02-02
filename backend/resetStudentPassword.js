const bcrypt = require('bcrypt');
const db = require('./db');

async function resetPassword() {
  const hash = await bcrypt.hash('student123', 10);
  await db.query('UPDATE students SET password = ? WHERE email = ?', [hash, 'student@example.com']);
  console.log('✅ Password reset for student@example.com');
  process.exit();
}

resetPassword();
