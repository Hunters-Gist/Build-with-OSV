import db from '../src/db/index.js';

try {
    db.prepare("ALTER TABLE jobs ADD COLUMN trello_card_id TEXT").run();
    console.log("Successfully migrated jobs table with Trello tracking ID.");
} catch (e) {
    if (e.message.includes('duplicate column')) {
        console.log("Already migrated.");
    } else {
        console.error("Migration error:", e.message);
    }
}
