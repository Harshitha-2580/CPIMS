const db = require('./db');

async function addDobPhoneColumns() {
    try {
        console.log('Adding DOB and Phone columns to students table...\n');
        
        // Add DOB column
        try {
            await db.query('ALTER TABLE students ADD COLUMN dob DATE DEFAULT NULL');
            console.log('✓ Added dob column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ dob column already exists');
            } else {
                throw e;
            }
        }
        
        // Add phone column
        try {
            await db.query('ALTER TABLE students ADD COLUMN phone VARCHAR(20) DEFAULT NULL');
            console.log('✓ Added phone column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ phone column already exists');
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

addDobPhoneColumns();
