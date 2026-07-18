-- Phase 8: God-Tier Society Management System Migration
-- Contains 38 advanced tables for the ultimate smart city application

-- 1. Core
CREATE TABLE IF NOT EXISTS societies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region_id TEXT NOT NULL,
    address TEXT,
    subscription_fee REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_members (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    role TEXT DEFAULT 'resident', -- 'admin', 'resident', 'guard', 'housekeeping'
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'inactive'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS visitor_logs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    purpose TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'entered', 'exited'
    entry_time TEXT,
    exit_time TEXT,
    guard_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS maintenance_bills (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid'
    billing_month TEXT NOT NULL,
    payment_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS society_notices (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 2. Add-Ons Pack 1
CREATE TABLE IF NOT EXISTS society_helpdesk (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    issue_type TEXT,
    description TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS society_amenities (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    hourly_rate REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS amenity_bookings (
    id TEXT PRIMARY KEY,
    amenity_id TEXT NOT NULL,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    FOREIGN KEY(amenity_id) REFERENCES society_amenities(id)
);

CREATE TABLE IF NOT EXISTS society_polls (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of options
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS society_classifieds (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 3. Add-Ons Pack 2
CREATE TABLE IF NOT EXISTS daily_staff (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- 'maid', 'cook', 'driver'
    phone TEXT,
    photo_url TEXT,
    rating REAL DEFAULT 0.0,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS daily_staff_flats (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    FOREIGN KEY(staff_id) REFERENCES daily_staff(id)
);

CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    license_plate TEXT NOT NULL,
    make_model TEXT,
    parking_slot TEXT,
    rfid_tag_id TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 4. Enterprise Pack 3
CREATE TABLE IF NOT EXISTS parcel_desk (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    courier_name TEXT,
    otp TEXT NOT NULL,
    status TEXT DEFAULT 'collected_by_guard', -- 'collected_by_guard', 'claimed'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS child_security (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    child_name TEXT NOT NULL,
    exit_permission TEXT DEFAULT 'requires_parent',
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS pet_registry (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    pet_type TEXT,
    pet_name TEXT NOT NULL,
    vaccination_status TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS move_passes (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    type TEXT, -- 'move_in', 'move_out'
    status TEXT DEFAULT 'pending',
    moving_date TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS society_vault (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 5. Flagship Pack 4
CREATE TABLE IF NOT EXISTS society_expenses (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    date TEXT,
    receipt_url TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS blood_donors (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    last_donated_at TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS utility_meters (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    meter_type TEXT NOT NULL, -- 'electricity', 'gas', 'fastag'
    current_balance REAL DEFAULT 0.0,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS meter_recharges (
    id TEXT PRIMARY KEY,
    meter_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_id TEXT,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(meter_id) REFERENCES utility_meters(id)
);

CREATE TABLE IF NOT EXISTS intercom_logs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    guard_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    call_status TEXT,
    duration INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 6. Unstoppable Pack 5
CREATE TABLE IF NOT EXISTS group_buy_campaigns (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    wholesale_price REAL NOT NULL,
    min_orders_required INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active',
    expires_at TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS group_buy_orders (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    payment_id TEXT,
    FOREIGN KEY(campaign_id) REFERENCES group_buy_campaigns(id)
);

CREATE TABLE IF NOT EXISTS society_carpools (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    seats_available INTEGER DEFAULT 1,
    cost_per_seat REAL DEFAULT 0.0,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS resident_directory (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    profession TEXT,
    skills TEXT,
    is_public INTEGER DEFAULT 1,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS lost_and_found (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    type TEXT, -- 'lost', 'found'
    status TEXT DEFAULT 'active',
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 7. Visionary Pack 6
CREATE TABLE IF NOT EXISTS ev_charging_stations (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    current_user_id TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS ev_charging_sessions (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    kwh_consumed REAL DEFAULT 0.0,
    cost REAL DEFAULT 0.0,
    FOREIGN KEY(station_id) REFERENCES ev_charging_stations(id)
);

CREATE TABLE IF NOT EXISTS water_meters (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    daily_consumption_liters REAL DEFAULT 0.0,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS society_karma_ledger (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    action TEXT, -- 'earned', 'spent'
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS cpr_responders (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    certification_level TEXT,
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

-- 8. God-Tier Pack 7
CREATE TABLE IF NOT EXISTS ai_cctv_alerts (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    threat_level TEXT,
    snapshot_url TEXT,
    status TEXT DEFAULT 'unread',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS faceid_profiles (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vector_data TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS iot_waste_bins (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity_percent INTEGER DEFAULT 0,
    last_emptied_at TEXT,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    assigned_to TEXT,
    task_type TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

CREATE TABLE IF NOT EXISTS drone_pad_deliveries (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    drone_operator TEXT,
    locker_pin TEXT NOT NULL,
    status TEXT DEFAULT 'arriving', -- 'arriving', 'landed', 'collected'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);
