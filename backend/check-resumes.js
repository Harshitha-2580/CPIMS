const db = require('./db');

async function checkResumes() {
  try {
    console.log('Checking resume tables...');

    // Check student_resumes table
    const [studentResumes] = await db.query('SELECT * FROM student_resumes');
    console.log('student_resumes table:', studentResumes);

    // Check if resumes table exists
    const [tables] = await db.query('SHOW TABLES LIKE "resumes"');
    if (tables.length > 0) {
      const [resumes] = await db.query('SELECT * FROM resumes');
      console.log('resumes table:', resumes);
    } else {
      console.log('resumes table does not exist');
    }

    process.exit(0);
  } catch (error) {
    console.error('Database error:', error.message);
    process.exit(1);
  }
}

checkResumes();