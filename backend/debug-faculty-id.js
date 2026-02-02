const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'sql12.freesqldatabase.com',
      user: 'sql12815335',
      password: 'bRqSAsrhGx',
      database: 'sql12815335'
    });
    
    console.log('\n=== Checking faculty_auth table ===');
    const [authRows] = await connection.query('SELECT faculty_id, email FROM faculty_auth');
    console.log('Records in faculty_auth:');
    authRows.forEach(row => {
      console.log(`  Faculty ID: "${row.faculty_id}" | Email: ${row.email}`);
    });
    
    console.log('\n=== Checking faculty table ===');
    const [facRows] = await connection.query('SELECT faculty_id, name FROM faculty LIMIT 5');
    console.log('Sample faculty records:');
    facRows.forEach(row => {
      console.log(`  Faculty ID: "${row.faculty_id}" | Name: ${row.name}`);
    });
    
    await connection.end();
  } catch(err) {
    console.error('Error:', err.message);
  }
})();
