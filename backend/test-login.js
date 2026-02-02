const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'sql12.freesqldatabase.com',
      user: 'sql12815335',
      password: 'bRqSAsrhGx',
      database: 'sql12815335'
    });
    
    console.log('\n=== Faculty Auth Records ===');
    const [authRows] = await connection.query('SELECT faculty_id, email, password FROM faculty_auth LIMIT 5');
    authRows.forEach(r => {
      console.log(`ID: ${r.faculty_id}, Email: ${r.email}, Has Password: ${r.password ? 'YES' : 'NO'}`);
    });
    
    console.log('\n=== Testing Login with NECN_FAC_001 ===');
    const [testAuth] = await connection.query(
      'SELECT * FROM faculty_auth WHERE faculty_id = ?',
      ['NECN_FAC_001']
    );
    
    if (testAuth.length > 0) {
      console.log('Found faculty_auth record:', testAuth[0]);
    } else {
      console.log('NO faculty_auth record found for NECN_FAC_001');
    }
    
    console.log('\n=== All faculty_auth IDs ===');
    const [allIds] = await connection.query('SELECT DISTINCT faculty_id FROM faculty_auth');
    allIds.forEach(row => console.log(row.faculty_id));
    
    await connection.end();
  } catch(err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
})();
