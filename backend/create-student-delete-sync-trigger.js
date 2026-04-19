const db = require('./db');
const db2 = require('./db2');

const triggerSql = `
DROP TRIGGER IF EXISTS trg_students_after_delete_cleanup_pending;
`;

const createTriggerSql = `
CREATE TRIGGER trg_students_after_delete_cleanup_pending
AFTER DELETE ON students
FOR EACH ROW
DELETE FROM pending_students
WHERE email = OLD.email OR roll_no = OLD.roll_no
`;

async function applyTrigger(connection, campusLabel) {
  try {
    await connection.query(triggerSql);
    await connection.query(createTriggerSql);
    console.log(`[${campusLabel}] Trigger created: trg_students_after_delete_cleanup_pending`);
  } catch (error) {
    console.error(`[${campusLabel}] Failed to create trigger:`, error.message);
    throw error;
  }
}

(async function run() {
  try {
    await applyTrigger(db, 'NECN');
    await applyTrigger(db2, 'NECG');
    console.log('Student delete sync trigger applied successfully on both campuses.');
    process.exit(0);
  } catch (error) {
    console.error('Trigger migration failed.');
    process.exit(1);
  }
})();
