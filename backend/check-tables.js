const db = require('./db');

async function checkTables() {
    try {
        const [apps] = await db.query('DESCRIBE applications');
        console.log('APPLICATIONS TABLE:');
        apps.forEach(f => console.log(`  ${f.Field}: ${f.Type}`));

        const [events] = await db.query('DESCRIBE faculty_event_registrations');
        console.log('\nEVENT REGISTRATIONS TABLE:');
        events.forEach(f => console.log(`  ${f.Field}: ${f.Type}`));

        const [opps] = await db.query('DESCRIBE opportunities');
        console.log('\nOPPORTUNITIES TABLE:');
        opps.forEach(f => console.log(`  ${f.Field}: ${f.Type}`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
