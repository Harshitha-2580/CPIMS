const db = require('./db');

async function getTableSchema() {
    try {
        const [columns] = await db.query(`SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'students' AND TABLE_SCHEMA = DATABASE()`);
        
        console.log('Students table columns:\n');
        columns.forEach(col => {
            console.log(`- ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

getTableSchema();
