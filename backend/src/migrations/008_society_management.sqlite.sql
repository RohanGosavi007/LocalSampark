-- ═══════════════════════════════════════════════════════════════
-- LocalSampark — Society Management System Migration
-- 18 new tables for the complete society visitor & management platform
-- ═══════════════════════════════════════════════════════════════

-- ─── SOCIETY MEMBERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_members (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    role TEXT DEFAULT 'resident',
    is_active INTEGER DEFAULT 1,
    added_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(society_id, user_id)
);

-- ─── SOCIETY SETTINGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_settings (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE UNIQUE,
    auto_approve_expected INTEGER DEFAULT 0,
    visitor_photo_required INTEGER DEFAULT 1,
    id_card_required INTEGER DEFAULT 1,
    max_visitors_per_flat INTEGER DEFAULT 10,
    guard_shift_start TEXT DEFAULT '06:00',
    guard_shift_end TEXT DEFAULT '22:00',
    maintenance_due_day INTEGER DEFAULT 5,
    late_fee_percentage REAL DEFAULT 5.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── SOCIETY NOTICES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_notices (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    posted_by TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── SOCIETY VISITORS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_visitors (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    resident_id TEXT REFERENCES users(id),
    guard_id TEXT REFERENCES users(id),
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    purpose TEXT DEFAULT 'guest',
    vehicle_number TEXT,
    visitor_photo_url TEXT,
    id_card_photo_url TEXT,
    flat_number TEXT,
    status TEXT DEFAULT 'pending',
    approved_at TEXT,
    checked_in_at TEXT,
    checked_out_at TEXT,
    qr_code TEXT,
    expected_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── SOCIETY VISITOR LOG ────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_visitor_log (
    id TEXT PRIMARY KEY,
    visitor_id TEXT REFERENCES society_visitors(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by TEXT REFERENCES users(id),
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── GUARD MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_guard_messages (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id),
    guard_id TEXT REFERENCES users(id),
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── GUARD REMINDERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_guard_reminders (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    guard_id TEXT REFERENCES users(id),
    created_by TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    reminder_time TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0,
    recurrence_pattern TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DOMESTIC STAFF ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_domestic_staff (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    staff_phone TEXT,
    staff_photo_url TEXT,
    staff_type TEXT NOT NULL,
    assigned_flats TEXT DEFAULT '[]',
    id_proof_url TEXT,
    is_active INTEGER DEFAULT 1,
    added_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── STAFF ATTENDANCE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_staff_attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES society_domestic_staff(id) ON DELETE CASCADE,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    marked_by TEXT REFERENCES users(id),
    check_in_time TEXT,
    check_out_time TEXT,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, date)
);

-- ─── MAINTENANCE BILLS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_maintenance_bills (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES society_members(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    month TEXT NOT NULL,
    base_amount REAL NOT NULL,
    water_charges REAL DEFAULT 0,
    parking_charges REAL DEFAULT 0,
    other_charges REAL DEFAULT 0,
    late_fee REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    paid_at TEXT,
    payment_reference TEXT,
    notes TEXT,
    generated_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── PARKING SLOTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_parking_slots (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    slot_number TEXT NOT NULL,
    slot_type TEXT DEFAULT 'car',
    flat_number TEXT,
    vehicle_number TEXT,
    vehicle_type TEXT,
    vehicle_photo_url TEXT,
    is_occupied INTEGER DEFAULT 0,
    assigned_to TEXT REFERENCES society_members(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(society_id, slot_number)
);

-- ─── AMENITIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_amenities (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    hourly_rate REAL DEFAULT 0,
    booking_advance_days INTEGER DEFAULT 7,
    available_from TEXT DEFAULT '06:00',
    available_until TEXT DEFAULT '22:00',
    is_active INTEGER DEFAULT 1,
    rules TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── AMENITY BOOKINGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_amenity_bookings (
    id TEXT PRIMARY KEY,
    amenity_id TEXT REFERENCES society_amenities(id) ON DELETE CASCADE,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    booked_by TEXT REFERENCES users(id),
    flat_number TEXT,
    booking_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose TEXT,
    guest_count INTEGER DEFAULT 0,
    total_charge REAL DEFAULT 0,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── COMPLAINTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_complaints (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    filed_by TEXT REFERENCES users(id),
    flat_number TEXT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_urls TEXT DEFAULT '[]',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    admin_notes TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── PACKAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_packages (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    resident_id TEXT REFERENCES users(id),
    logged_by TEXT REFERENCES users(id),
    courier_name TEXT,
    package_description TEXT,
    package_photo_url TEXT,
    receiver_name TEXT,
    status TEXT DEFAULT 'received',
    collected_at TEXT,
    collected_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── POLLS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_polls (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    options TEXT NOT NULL,
    poll_type TEXT DEFAULT 'single',
    is_anonymous INTEGER DEFAULT 0,
    starts_at TEXT,
    ends_at TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── POLL VOTES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_poll_votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT REFERENCES society_polls(id) ON DELETE CASCADE,
    voter_id TEXT REFERENCES users(id),
    selected_option INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, voter_id)
);

-- ─── EMERGENCY ALERTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_emergency_alerts (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    triggered_by TEXT REFERENCES users(id),
    alert_type TEXT NOT NULL,
    description TEXT,
    flat_number TEXT,
    status TEXT DEFAULT 'active',
    resolved_at TEXT,
    resolved_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── EVENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_events (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    venue TEXT,
    event_type TEXT DEFAULT 'general',
    max_attendees INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── EVENT RSVPs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS society_event_rsvps (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES society_events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    flat_number TEXT,
    guests_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'going',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_society_members_society ON society_members (society_id);
CREATE INDEX IF NOT EXISTS idx_society_members_user ON society_members (user_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_society ON society_visitors (society_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_resident ON society_visitors (resident_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_status ON society_visitors (status);
CREATE INDEX IF NOT EXISTS idx_guard_reminders_guard ON society_guard_reminders (guard_id);
CREATE INDEX IF NOT EXISTS idx_guard_reminders_time ON society_guard_reminders (reminder_time);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON society_staff_attendance (date);
CREATE INDEX IF NOT EXISTS idx_maintenance_bills_month ON society_maintenance_bills (month);
CREATE INDEX IF NOT EXISTS idx_maintenance_bills_status ON society_maintenance_bills (payment_status);
CREATE INDEX IF NOT EXISTS idx_parking_slots_society ON society_parking_slots (society_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON society_complaints (status);
CREATE INDEX IF NOT EXISTS idx_packages_status ON society_packages (status);
CREATE INDEX IF NOT EXISTS idx_polls_society ON society_polls (society_id);
CREATE INDEX IF NOT EXISTS idx_emergency_society ON society_emergency_alerts (society_id);
CREATE INDEX IF NOT EXISTS idx_events_society ON society_events (society_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON society_events (event_date);
