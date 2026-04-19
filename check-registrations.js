const db = require('./backend/db');
const db2 = require('./backend/db2');

async function checkRegistrationData() {
  try {
    console.log('\n========== NECN Registrations Data ==========');
    
    const [regs] = await db.query(`
      SELECT * FROM student_registrations LIMIT 10
    `);
    console.log('Sample registrations:');
    console.log(regs);

    const [regsSummary] = await db.query(`
      SELECT status, COUNT(*) as count FROM student_registrations GROUP BY status
    `);
    console.log('\nRegistrations by status:');
    console.log(regsSummary);

    console.log('\n========== NECG Registrations Data ==========');
    
    const [regs2] = await db2.query(`
      SELECT * FROM student_registrations LIMIT 10
    `);
    console.log('Sample registrations (NECG):');
    console.log(regs2);

    const [regsSummary2] = await db2.query(`
      SELECT status, COUNT(*) as count FROM student_registrations GROUP BY status
    `);
    console.log('\nRegistrations by status (NECG):');
    console.log(regsSummary2);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkRegistrationData();
