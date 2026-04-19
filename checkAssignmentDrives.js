const db = require('./backend/db');

async function ensureColumns() {
    const cols = [
        { name: 'location', type: "VARCHAR(255)" },
        { name: 'location_type', type: "ENUM('oncampus','offcampus') DEFAULT 'oncampus'" },
        { name: 'drive_date', type: "DATETIME" }
    ];
    
    for (const col of cols) {
        const [rows] = await db.query(
            `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assignments_drives' AND COLUMN_NAME = ?`,
            [col.name]
        );
        if (rows[0].cnt === 0) {
            console.log(`adding column ${col.name} to assignments_drives`);
            await db.query(`ALTER TABLE assignments_drives ADD COLUMN ${col.name} ${col.type}`);
        } else {
            console.log(`column ${col.name} already exists`);
        }
    }
}

async function run() {
    try {
        await ensureColumns();
        console.log('assignments_drives table migration completed');
        process.exit(0);
    } catch (err) {
        console.error('migration error', err);
        process.exit(1);
    }
}

run();
