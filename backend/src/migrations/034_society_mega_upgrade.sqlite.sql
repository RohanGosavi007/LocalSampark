-- PHASE 2 TABLES
CREATE TABLE IF NOT EXISTS society_visitor_preapprovals (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    purpose TEXT,
    vehicle_number TEXT,
    passcode TEXT,
    qr_data TEXT,
    valid_from DATETIME,
    valid_until DATETIME,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    leave_at_gate INTEGER DEFAULT 0,
    is_revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_ivr_logs (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    phone_called TEXT NOT NULL,
    call_status TEXT,
    dtmf_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_visitor_blacklist (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    reason TEXT,
    added_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_cab_preapprovals (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    cab_service TEXT,
    estimated_arrival DATETIME,
    driver_name TEXT,
    passcode TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 3 TABLES
CREATE TABLE IF NOT EXISTS society_billing_config (
    society_id TEXT PRIMARY KEY,
    construction_cost_per_sqft REAL,
    sinking_fund_rate_percent REAL,
    gst_enabled INTEGER DEFAULT 0,
    billing_day INTEGER DEFAULT 1,
    late_penalty_rate_percent REAL DEFAULT 21,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_flat_ledger (
    flat_number TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    carpet_area REAL,
    bhk_type TEXT,
    is_tenant INTEGER DEFAULT 0,
    tenant_lease_end DATETIME,
    outstanding_balance REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_charge_heads (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL,
    gst_applicable INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS society_invoice_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    charge_head_id TEXT,
    description TEXT,
    amount REAL,
    gst_amount REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS society_payment_receipts (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    amount_paid REAL NOT NULL,
    payment_mode TEXT,
    transaction_ref TEXT,
    receipt_pdf_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_penalty_ledger (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    amount REAL NOT NULL,
    days_overdue INTEGER,
    is_reversed INTEGER DEFAULT 0,
    reverse_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_advance_account (
    flat_number TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    balance REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_tally_exports (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    export_type TEXT,
    xml_payload TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 4 TABLES
CREATE TABLE IF NOT EXISTS society_patrol_routes (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    checkpoints_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_patrol_logs (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    guard_id TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    scanned_checkpoints_json TEXT,
    completion_percent REAL,
    status TEXT DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS society_gates (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS society_vehicle_log (
    id TEXT PRIMARY KEY,
    gate_id TEXT,
    vehicle_number TEXT NOT NULL,
    entry_time DATETIME,
    exit_time DATETIME,
    vehicle_photo_url TEXT,
    status TEXT DEFAULT 'entered'
);

CREATE TABLE IF NOT EXISTS society_utility_deliveries (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    gate_id TEXT,
    utility_type TEXT,
    vendor_name TEXT,
    quantity REAL,
    challan_photo_url TEXT,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 5 TABLES
CREATE TABLE IF NOT EXISTS society_police_verification (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    expiry_date DATETIME,
    verified_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 6 TABLES
CREATE TABLE IF NOT EXISTS society_admin_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    society_id TEXT NOT NULL,
    role_name TEXT NOT NULL,
    permissions TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS society_vendors (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    vendor_type TEXT,
    contract_start DATETIME,
    contract_end DATETIME,
    monthly_cost REAL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS society_vendor_invoices (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    amount REAL NOT NULL,
    gst_amount REAL DEFAULT 0,
    invoice_date DATETIME,
    status TEXT DEFAULT 'pending',
    payment_ref TEXT
);

CREATE TABLE IF NOT EXISTS society_staff_payroll (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    month TEXT NOT NULL,
    base_salary REAL,
    net_salary REAL,
    deductions REAL DEFAULT 0,
    bonus REAL DEFAULT 0,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS society_assets (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    amc_vendor_id TEXT,
    amc_expiry DATETIME,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS society_asset_maintenance_log (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    service_type TEXT,
    service_date DATETIME,
    cost REAL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS society_expense_categories (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL
);

-- PHASE 7 TABLES
CREATE TABLE IF NOT EXISTS society_complaint_activity (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    changed_by TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 8 TABLES
CREATE TABLE IF NOT EXISTS society_amenity_locks (
    id TEXT PRIMARY KEY,
    amenity_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    locked_until DATETIME NOT NULL
);

-- PHASE 9 TABLES
CREATE TABLE IF NOT EXISTS society_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_forum_topics (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    content TEXT,
    is_pinned INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_forum_replies (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 10 TABLES
CREATE TABLE IF NOT EXISTS society_guard_shifts (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    guard_id TEXT NOT NULL,
    gate_id TEXT,
    shift_name TEXT,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS society_guard_shift_swaps (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    requested_with TEXT,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS society_staff_ratings (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_intercom_sessions (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    caller_id TEXT,
    receiver_id TEXT,
    status TEXT DEFAULT 'initiated',
    duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 11 TABLES
CREATE TABLE IF NOT EXISTS society_budget (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    year TEXT NOT NULL,
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_budget_items (
    id TEXT PRIMARY KEY,
    budget_id TEXT NOT NULL,
    category TEXT NOT NULL,
    allocated_amount REAL,
    spent_amount REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS society_agm_meetings (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    title TEXT NOT NULL,
    agenda TEXT,
    meeting_date DATETIME,
    venue TEXT,
    quorum_required INTEGER,
    status TEXT DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS society_agm_minutes (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    content TEXT NOT NULL,
    published_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_document_templates (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS society_fire_safety (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    equipment_type TEXT,
    location TEXT,
    last_inspection DATETIME,
    next_due DATETIME,
    status TEXT DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS society_delivery_preferences (
    flat_number TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    leave_at_gate INTEGER DEFAULT 0,
    preferred_window TEXT,
    package_location TEXT
);

-- Alter Tables (Ignoring errors if they already exist)
-- The runner script will run these individually and ignore "duplicate column" errors.
ALTER TABLE society_visitors ADD COLUMN max_stay_minutes INTEGER DEFAULT 120;
ALTER TABLE society_visitors ADD COLUMN overstay_alert_sent INTEGER DEFAULT 0;
ALTER TABLE society_visitors ADD COLUMN delivery_type TEXT;
ALTER TABLE society_visitors ADD COLUMN is_leave_at_gate INTEGER DEFAULT 0;
ALTER TABLE society_visitors ADD COLUMN parcel_photo_url TEXT;
ALTER TABLE society_visitors ADD COLUMN gate_id TEXT;
ALTER TABLE society_visitors ADD COLUMN approval_timeout_at DATETIME;
ALTER TABLE society_visitors ADD COLUMN ivr_fallback_triggered INTEGER DEFAULT 0;
ALTER TABLE society_visitors ADD COLUMN passcode_used INTEGER DEFAULT 0;

ALTER TABLE society_staff_attendance ADD COLUMN gate_id TEXT;
ALTER TABLE society_staff_attendance ADD COLUMN face_match_score REAL;
ALTER TABLE society_staff_attendance ADD COLUMN check_in_photo_url TEXT;

ALTER TABLE society_complaints ADD COLUMN sla_hours INTEGER DEFAULT 24;
ALTER TABLE society_complaints ADD COLUMN escalation_level INTEGER DEFAULT 0;
ALTER TABLE society_complaints ADD COLUMN escalated_to TEXT;
ALTER TABLE society_complaints ADD COLUMN eta DATETIME;
ALTER TABLE society_complaints ADD COLUMN latitude REAL;
ALTER TABLE society_complaints ADD COLUMN longitude REAL;
ALTER TABLE society_complaints ADD COLUMN reopened_count INTEGER DEFAULT 0;
ALTER TABLE society_complaints ADD COLUMN resolution_feedback INTEGER;
ALTER TABLE society_complaints ADD COLUMN resolution_comment TEXT;

ALTER TABLE society_amenities ADD COLUMN peak_hour_rate REAL;
ALTER TABLE society_amenities ADD COLUMN peak_hours TEXT;
ALTER TABLE society_amenities ADD COLUMN max_bookings_per_week INTEGER;
ALTER TABLE society_amenities ADD COLUMN cooldown_hours INTEGER;
ALTER TABLE society_amenities ADD COLUMN cancellation_penalty REAL;
ALTER TABLE society_amenities ADD COLUMN advance_payment_required INTEGER DEFAULT 0;
ALTER TABLE society_amenities ADD COLUMN images TEXT;

ALTER TABLE society_members ADD COLUMN show_phone INTEGER DEFAULT 1;
ALTER TABLE society_members ADD COLUMN show_email INTEGER DEFAULT 1;
ALTER TABLE society_members ADD COLUMN profession TEXT;
ALTER TABLE society_members ADD COLUMN skills TEXT;
ALTER TABLE society_members ADD COLUMN bio TEXT;
ALTER TABLE society_members ADD COLUMN occupancy_type TEXT;
ALTER TABLE society_members ADD COLUMN member_since DATETIME;

ALTER TABLE society_polls ADD COLUMN is_secret_ballot INTEGER DEFAULT 0;
ALTER TABLE society_polls ADD COLUMN eligible_voters TEXT;
ALTER TABLE society_polls ADD COLUMN min_quorum_percent REAL;
ALTER TABLE society_polls ADD COLUMN result_visibility TEXT DEFAULT 'public';

-- Assuming society_move_passes exists based on move_passes referenced
ALTER TABLE society_move_passes ADD COLUMN requested_by TEXT;
ALTER TABLE society_move_passes ADD COLUMN clearance_status TEXT;
ALTER TABLE society_move_passes ADD COLUMN outstanding_dues REAL;
ALTER TABLE society_move_passes ADD COLUMN gate_passcode TEXT;
ALTER TABLE society_move_passes ADD COLUMN movers_company TEXT;
ALTER TABLE society_move_passes ADD COLUMN movers_vehicle_number TEXT;
ALTER TABLE society_move_passes ADD COLUMN admin_approved_at DATETIME;
ALTER TABLE society_move_passes ADD COLUMN admin_approved_by TEXT;
ALTER TABLE society_move_passes ADD COLUMN notes TEXT;

-- Assuming society_vehicles exists
ALTER TABLE society_vehicles ADD COLUMN vehicle_photo_url TEXT;
ALTER TABLE society_vehicles ADD COLUMN is_active INTEGER DEFAULT 1;

ALTER TABLE society_settings ADD COLUMN overstay_timeout_minutes INTEGER DEFAULT 120;
ALTER TABLE society_settings ADD COLUMN ivr_enabled INTEGER DEFAULT 0;
ALTER TABLE society_settings ADD COLUMN ivr_provider TEXT;
ALTER TABLE society_settings ADD COLUMN whatsapp_enabled INTEGER DEFAULT 0;
ALTER TABLE society_settings ADD COLUMN multilingual_enabled INTEGER DEFAULT 0;
ALTER TABLE society_settings ADD COLUMN default_language TEXT DEFAULT 'en';
ALTER TABLE society_settings ADD COLUMN face_recognition_enabled INTEGER DEFAULT 0;
ALTER TABLE society_settings ADD COLUMN patrol_enabled INTEGER DEFAULT 0;
ALTER TABLE society_settings ADD COLUMN cab_preapproval_enabled INTEGER DEFAULT 0;
