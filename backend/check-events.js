const db = require('./db');

async function checkEvents() {
    try {
        const [events] = await db.query('DESCRIBE faculty_events');
        console.log('FACULTY_EVENTS TABLE:');
        events.forEach(f => console.log(`  ${f.Field}: ${f.Type}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkEvents();
