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
    'ALTER TABLE quotes ADD COLUMN portal_token_hash TEXT',
    'ALTER TABLE quotes ADD COLUMN portal_token_expires_at INTEGER',
    'ALTER TABLE leads ADD COLUMN estimated_value REAL',
    'ALTER TABLE quotes ADD COLUMN client_suburb TEXT',
    'ALTER TABLE quotes ADD COLUMN client_postcode TEXT',
    'ALTER TABLE quotes ADD COLUMN calibration_profile_version INTEGER',
    'ALTER TABLE quotes ADD COLUMN prompt_profile_version INTEGER',
    `CREATE TABLE IF NOT EXISTS pricing_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT NOT NULL UNIQUE,
        provider TEXT,
        source_url TEXT,
        search_query TEXT,
        unit_price REAL,
        unit TEXT,
        raw_json TEXT,
        updated_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS location_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        value_json TEXT NOT NULL,
        updated_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS quote_revisions (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id),
        quote_num TEXT,
        edit_reason TEXT NOT NULL,
        edit_notes TEXT,
        edited_by TEXT,
        edit_source TEXT DEFAULT 'backoffice',
        before_json TEXT NOT NULL,
        after_json TEXT NOT NULL,
        before_total REAL,
        after_total REAL,
        delta_total REAL,
        created_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS quote_adjustment_deltas (
        id TEXT PRIMARY KEY,
        revision_id TEXT NOT NULL REFERENCES quote_revisions(id),
        quote_id TEXT NOT NULL REFERENCES quotes(id),
        quote_num TEXT,
        trade TEXT,
        category TEXT,
        item_name TEXT,
        item_signature TEXT,
        change_type TEXT,
        line_index_before INTEGER,
        line_index_after INTEGER,
        qty_before REAL,
        qty_after REAL,
        unit_price_before REAL,
        unit_price_after REAL,
        unit_price_delta REAL,
        unit_price_delta_pct REAL,
        total_before REAL,
        total_after REAL,
        total_delta REAL,
        total_delta_pct REAL,
        suburb TEXT,
        postcode TEXT,
        reason_code TEXT,
        created_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS quote_calibration_profiles (
        id TEXT PRIMARY KEY,
        trade TEXT NOT NULL,
        category TEXT NOT NULL,
        item_signature TEXT NOT NULL,
        item_name TEXT,
        sample_count INTEGER NOT NULL DEFAULT 0,
        avg_unit_price_delta_pct REAL NOT NULL DEFAULT 0,
        avg_total_delta_pct REAL NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 0,
        profile_version INTEGER NOT NULL DEFAULT 1,
        last_revision_id TEXT,
        last_updated_at INTEGER,
        UNIQUE(trade, category, item_signature)
    )`,
    `CREATE TABLE IF NOT EXISTS quote_prompt_profiles (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL UNIQUE,
        trade TEXT,
        summary TEXT,
        profile_json TEXT NOT NULL,
        generated_from_json TEXT,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at INTEGER,
        approved_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS quote_learning_metrics (
        metric_key TEXT PRIMARY KEY,
        metric_value INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS quote_external_pricing_metrics (
        id TEXT PRIMARY KEY,
        dataset_key TEXT NOT NULL,
        trade TEXT NOT NULL,
        category TEXT,
        item_name TEXT NOT NULL,
        unit TEXT,
        base_rate_ex_gst REAL,
        sell_rate_ex_gst REAL,
        notes TEXT,
        source_file TEXT,
        row_signature TEXT NOT NULL,
        imported_at INTEGER NOT NULL,
        UNIQUE(dataset_key, trade, row_signature)
    )`,
    `CREATE TABLE IF NOT EXISTS quote_external_pricing_bundles (
        id TEXT PRIMARY KEY,
        dataset_key TEXT NOT NULL,
        trade TEXT NOT NULL,
        bundle_name TEXT NOT NULL,
        formula TEXT,
        typical_rate_per_m2_ex_gst REAL,
        source_file TEXT,
        imported_at INTEGER NOT NULL,
        UNIQUE(dataset_key, trade, bundle_name)
    )`,
    `CREATE TABLE IF NOT EXISTS quote_portal_nonces (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id),
        action TEXT NOT NULL,
        nonce TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(quote_id, action, nonce)
    )`,
    `CREATE TABLE IF NOT EXISTS quote_portal_audit (
        id TEXT PRIMARY KEY,
        quote_id TEXT REFERENCES quotes(id),
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT,
        nonce TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS security_audit_events (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        outcome TEXT NOT NULL,
        reason TEXT,
        path TEXT,
        method TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL
    )`,
];

function isIgnorableMigrationError(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code && code !== 'SQLITE_ERROR') return false;
    return /duplicate column name/i.test(message) || /table .* already exists/i.test(message);
}

for (const sql of migrations) {
    try {
        db.exec(sql);
    } catch (error) {
        if (isIgnorableMigrationError(error)) {
            console.warn(`[DB migration] Ignored idempotent migration error: ${error.message}`);
            continue;
        }

        console.error('[DB migration] Migration failed and startup will stop.');
        console.error(`[DB migration] SQL: ${sql}`);
        console.error(error);
        throw error;
    }
}

export default db;
