-- Clients
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    contact TEXT,
    created_at INTEGER
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    quote_num TEXT,
    quote_date TEXT,
    client_id TEXT REFERENCES clients(id),
    client_name TEXT,
    client_email TEXT,
    client_addr TEXT,
    client_suburb TEXT,
    client_postcode TEXT,
    client_contact TEXT,
    trade TEXT,
    summary TEXT,
    sub_labour REAL,
    mat_total REAL,
    total_cost REAL,
    margin REAL,
    profit REAL,
    final_client_quote REAL,
    status TEXT DEFAULT 'draft',
    sent_at INTEGER,
    issued_at INTEGER,
    accepted_at INTEGER,
    deposit_paid_at INTEGER,
    deposit_amount REAL,
    stripe_session_id TEXT,
    portal_token_hash TEXT,
    portal_token_expires_at INTEGER,
    contingency REAL,
    include_contingency INTEGER,
    notes TEXT,
    generated_json TEXT,
    selected_materials TEXT,
    calibration_profile_version INTEGER,
    prompt_profile_version INTEGER,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS quote_revisions (
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
);

CREATE TABLE IF NOT EXISTS quote_adjustment_deltas (
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
);

CREATE TABLE IF NOT EXISTS quote_calibration_profiles (
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
);

CREATE TABLE IF NOT EXISTS quote_prompt_profiles (
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
);

CREATE TABLE IF NOT EXISTS quote_learning_metrics (
    metric_key TEXT PRIMARY KEY,
    metric_value INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS quote_external_pricing_metrics (
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
);

CREATE TABLE IF NOT EXISTS quote_external_pricing_bundles (
    id TEXT PRIMARY KEY,
    dataset_key TEXT NOT NULL,
    trade TEXT NOT NULL,
    bundle_name TEXT NOT NULL,
    formula TEXT,
    typical_rate_per_m2_ex_gst REAL,
    source_file TEXT,
    imported_at INTEGER NOT NULL,
    UNIQUE(dataset_key, trade, bundle_name)
);

CREATE TABLE IF NOT EXISTS quote_portal_nonces (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id),
    action TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(quote_id, action, nonce)
);

CREATE TABLE IF NOT EXISTS quote_portal_audit (
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
);

CREATE TABLE IF NOT EXISTS security_audit_events (
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
);

-- Live supplier pricing cache
CREATE TABLE IF NOT EXISTS pricing_cache (
    id TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    provider TEXT,
    source_url TEXT,
    search_query TEXT,
    unit_price REAL,
    unit TEXT,
    raw_json TEXT,
    updated_at INTEGER
);

-- Geocode/route lookup cache
CREATE TABLE IF NOT EXISTS location_cache (
    id TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER
);

-- Variations
CREATE TABLE IF NOT EXISTS variations (
    id TEXT PRIMARY KEY,
    quote_id TEXT REFERENCES quotes(id),
    quote_num TEXT,
    client_name TEXT,
    description TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER
);

-- Subcontractors
CREATE TABLE IF NOT EXISTS subcontractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    business TEXT,
    trade TEXT,
    crew_size INTEGER,
    abn TEXT,
    license_num TEXT,
    insurance_expiry TEXT,
    bio TEXT,
    rate_per_hr REAL,
    phone TEXT,
    email TEXT,
    rating REAL DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Iron',
    is_apex INTEGER DEFAULT 0,
    fee_discount_pct REAL DEFAULT 0.0,
    notes TEXT,
    created_at INTEGER
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    job_num TEXT,
    title TEXT,
    client_name TEXT,
    client_addr TEXT,
    trade TEXT,
    crew_size INTEGER,
    hours_est REAL,
    scope_notes TEXT,
    materials_notes TEXT,
    status TEXT DEFAULT 'Posted',
    assigned_sub_id TEXT REFERENCES subcontractors(id),
    assigned_sub_name TEXT,
    quote_num TEXT,
    trello_card_id TEXT,
    due_date TEXT,
    risk_flag TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    inv_num TEXT,
    job_id TEXT REFERENCES jobs(id),
    job_num TEXT,
    client_name TEXT,
    client_addr TEXT,
    trade TEXT,
    scope_notes TEXT,
    sub_name TEXT,
    labour_cost REAL,
    mat_cost REAL,
    total REAL,
    pay_status TEXT DEFAULT 'Unpaid',
    due_date TEXT,
    notes TEXT,
    created_at INTEGER
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    ref_num TEXT,
    client_name TEXT,
    phone TEXT,
    email TEXT,
    suburb TEXT,
    job_title TEXT,
    trade TEXT,
    property_type TEXT,
    urgency TEXT,
    budget_range TEXT,
    estimated_value REAL,
    start_date TEXT,
    description TEXT,
    source TEXT,
    stage TEXT DEFAULT 'New',
    ai_json TEXT,
    quote_id TEXT REFERENCES quotes(id),
    created_at INTEGER,
    updated_at INTEGER
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    name TEXT,
    created_at INTEGER
);
