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
    contingency REAL,
    include_contingency INTEGER,
    notes TEXT,
    generated_json TEXT,
    selected_materials TEXT,
    created_at INTEGER,
    updated_at INTEGER
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
