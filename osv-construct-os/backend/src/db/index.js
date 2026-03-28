import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a persistent directory if provided via environment variables (e.g. for Render), 
// otherwise default to the root backend folder for local development.
const dbDir = process.env.DB_DIR || path.join(__dirname, '..', '..');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'osv-construct.db');
const db = new Database(dbPath);

// Initialize database with schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema);

// Migrations for existing databases — safely add new columns
const migrations = [
    'ALTER TABLE jobs ADD COLUMN due_date TEXT',
    'ALTER TABLE jobs ADD COLUMN risk_flag TEXT',
    'ALTER TABLE quotes ADD COLUMN sent_at INTEGER',
    'ALTER TABLE quotes ADD COLUMN client_email TEXT',
    'ALTER TABLE quotes ADD COLUMN issued_at INTEGER',
    'ALTER TABLE quotes ADD COLUMN accepted_at INTEGER',
    'ALTER TABLE quotes ADD COLUMN deposit_paid_at INTEGER',
    'ALTER TABLE quotes ADD COLUMN deposit_amount REAL',
    'ALTER TABLE quotes ADD COLUMN stripe_session_id TEXT',
    'ALTER TABLE leads ADD COLUMN estimated_value REAL',
];

for (const sql of migrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
}

export default db;
