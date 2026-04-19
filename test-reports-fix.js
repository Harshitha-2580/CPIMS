const db = require('./backend/db');
const db2 = require('./backend/db2');

async function testReportsAPI() {
  try {
    console.log('\n========== Testing Reports API Calculations ==========\n');

    console.log('NECN Campus:');
    
    // Test placed students
    const [[{ placed_count }]] = await db.query(`
      SELECT COUNT(*) as placed_count FROM students WHERE placement_status = 'placed'
    `);
    console.log(`✓ Placed students: ${placed_count}`);

    // Test total participants
    const [[{ total_students }]] = await db.query(`
      SELECT COUNT(*) as total_students FROM students
    `);
    console.log(`✓ Total students (participants): ${total_students}`);

    // Test placement rate
    let rate = 0;
    if (total_students > 0) {
      rate = Math.round((placed_count / total_students) * 100);
    }
    console.log(`✓ Placement rate: ${rate}%`);

    // Test avg package
    const [avg_result] = await db.query(`
      SELECT 
        AVG(
          CAST(
            CASE 
              WHEN salary_package LIKE '%L' OR salary_package LIKE '%l' 
                THEN REPLACE(REPLACE(REPLACE(salary_package, 'L', ''), 'l', ''), ' ', '')
              WHEN salary_package LIKE '%,%' 
                THEN CAST(REPLACE(salary_package, ',', '') AS DECIMAL(10,2)) / 100000
              ELSE salary_package
            END
          AS DECIMAL(10,2))
        ) as avg_package
      FROM placements
      WHERE salary_package IS NOT NULL AND salary_package != '' AND salary_package != '0'
    `);
    const avgPkg = avg_result[0]?.avg_package || 0;
    console.log(`✓ Average package: ${Number(avgPkg).toFixed(2)}L`);

    // Test total drives
    const [[{ total_drives }]] = await db.query(`
      SELECT COUNT(*) as total_drives FROM placements WHERE is_active = TRUE
    `);
    console.log(`✓ Total placement drives: ${total_drives}`);

    console.log('\nNECG Campus:');
    
    // Test placed students (NECG)
    const [[{ placed_count2 }]] = await db2.query(`
      SELECT COUNT(*) as placed_count FROM students WHERE placement_status = 'placed'
    `);
    console.log(`✓ Placed students: ${placed_count2}`);

    // Test total participants (NECG)
    const [[{ total_students2 }]] = await db2.query(`
      SELECT COUNT(*) as total_students FROM students
    `);
    console.log(`✓ Total students (participants): ${total_students2}`);

    // Test placement rate (NECG)
    let rate2 = 0;
    if (total_students2 > 0) {
      rate2 = Math.round((placed_count2 / total_students2) * 100);
    }
    console.log(`✓ Placement rate: ${rate2}%`);

    console.log('\n========== Results Summary ==========');
    console.log('NECN: Should now show 1 placed student out of 30 total (3.33% rate)');
    console.log('NECG: Should show 0 placed students (no data yet)');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testReportsAPI();
