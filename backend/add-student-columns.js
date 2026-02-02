const db = require('./db');

async function addColumns() {
    try {
        console.log('Adding columns to students table...\n');
        
        // Add CGPA column
        try {
            await db.query('ALTER TABLE students ADD COLUMN cgpa DECIMAL(3,2) DEFAULT NULL');
            console.log('✓ Added cgpa column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ cgpa column already exists');
            } else {
                throw e;
            }
        }
        
        // Add placement_status column
        try {
            await db.query('ALTER TABLE students ADD COLUMN placement_status ENUM("placed","unplaced") DEFAULT "unplaced"');
            console.log('✓ Added placement_status column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ placement_status column already exists');
            } else {
                throw e;
            }
        }
        
        // Verify the columns
        const [columns] = await db.query('DESCRIBE students');
        console.log('\n✓ Students table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        console.log('\n✅ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addColumns();
