-- Initialize Database Schema for LocalSampark (SQLite version)

-- ─── REGIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    region_type TEXT NOT NULL DEFAULT 'locality', -- state, district, taluka, village, locality
    parent_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
    pincode TEXT,
    state TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_km REAL DEFAULT 5.0,
    district TEXT,
    city TEXT,
    is_active INTEGER DEFAULT 0,
    launch_date TEXT,
    population_estimate INTEGER,
    tier TEXT DEFAULT 'tier3', -- tier1/tier2/tier3
    zone_type TEXT DEFAULT 'urban', -- urban/suburban/rural
    local_language TEXT DEFAULT 'mr', -- primary local language
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_regions_district ON regions (district);
CREATE INDEX IF NOT EXISTS idx_regions_pincode ON regions (pincode);
CREATE INDEX IF NOT EXISTS idx_regions_state ON regions (state);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions (is_active);

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- user, shop_owner, delivery_agent, service_provider, moderator, territory_admin, area_agent, super_admin
    avatar_url TEXT,
    bio TEXT,
    language_preference TEXT DEFAULT 'en',
    region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
    is_verified INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    password_hash TEXT,
    whatsapp_number TEXT,
    auth_method TEXT DEFAULT 'phone_otp',
    last_login_at TEXT,
    login_count INTEGER DEFAULT 0,
    active_zone_id TEXT REFERENCES regions(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_saved_zones (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    label TEXT, -- 'Home', 'Office', 'Parents'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, region_id)
);

-- ─── ADMIN CONFIG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_config (
    id TEXT PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_category TEXT NOT NULL,
    description TEXT,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── USER WALLETS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance REAL NOT NULL DEFAULT 0.00,
    currency TEXT DEFAULT 'INR',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT REFERENCES wallets(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- credit, debit
    purpose TEXT NOT NULL, -- order_payment, order_payout, refund, wallet_load, withdrawal, referral_bonus, reward_redemption
    reference_id TEXT,
    status TEXT DEFAULT 'completed', -- pending, completed, failed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── SOCIETIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS societies (
    id TEXT PRIMARY KEY,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    coordinate TEXT,
    visitor_gate_pass_code TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── COMMUNITY FEED (POSTS, COMMENTS, VOTES) ────────────────
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    society_id TEXT REFERENCES societies(id) ON DELETE SET NULL,
    content TEXT,
    media_urls TEXT DEFAULT '[]',
    post_type TEXT DEFAULT 'discussion', -- discussion, announcement, alert, offer, lost_found
    upvotes_count INTEGER DEFAULT 0,
    downvotes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    coordinate TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL, -- up, down
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- ─── LOCAL SHOPS & DIRECTORY ────────────────────────────────
CREATE TABLE IF NOT EXISTS local_shops (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    phone_number TEXT,
    address TEXT NOT NULL,
    coordinate TEXT NOT NULL,
    opening_hours TEXT, -- {"open": "09:00", "close": "21:00"}
    photo_urls TEXT DEFAULT '[]',
    is_verified INTEGER DEFAULT 0,
    is_premium INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_products (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    is_available INTEGER DEFAULT 1,
    image_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_reviews (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    photo_urls TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, user_id)
);

-- ─── GIG ECONOMY & JOBS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_skills (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    daily_rate REAL,
    availability_status TEXT DEFAULT 'available', -- available, busy, offline
    portfolio_photos TEXT DEFAULT '[]',
    is_certified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

CREATE TABLE IF NOT EXISTS job_vacancies (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    salary_range TEXT,
    job_type TEXT DEFAULT 'full_time', -- full_time, part_time, gig
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES job_vacancies(id) ON DELETE CASCADE,
    applicant_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    cover_note TEXT,
    status TEXT DEFAULT 'applied', -- applied, shortlisted, interviewed, hired, rejected
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skilled_bookings (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    assigned_worker_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    service_category TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    preferred_date TEXT,
    status TEXT DEFAULT 'pending', -- pending, assigned, completed, cancelled
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── REAL ESTATE HUB ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_listings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    property_type TEXT NOT NULL, -- flat, house, pg, commercial
    listing_type TEXT NOT NULL, -- rent, sale
    price REAL NOT NULL,
    deposit REAL,
    flat_sharing TEXT, -- for PGs: private, sharing
    gender_preference TEXT, -- male, female, family, any
    amenities TEXT DEFAULT '[]',
    photo_urls TEXT DEFAULT '[]',
    coordinate TEXT,
    is_verified INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DELIVERY SYSTEM ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    vehicle_type TEXT NOT NULL, -- bicycle, motorcycle, walking
    vehicle_number TEXT,
    is_online INTEGER DEFAULT 0,
    coordinate TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE SET NULL,
    total_amount REAL NOT NULL,
    delivery_fee REAL NOT NULL,
    payment_method TEXT NOT NULL, -- cod, razorpay, wallet, upi
    payment_status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
    order_status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, assigned, out_for_delivery, delivered, cancelled
    delivery_address TEXT NOT NULL,
    delivery_coordinate TEXT NOT NULL,
    otp_code TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES shop_products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    agent_id TEXT REFERENCES delivery_agents(id) ON DELETE SET NULL,
    pickup_coordinate TEXT NOT NULL,
    delivery_coordinate TEXT NOT NULL,
    payout_amount REAL NOT NULL,
    status TEXT DEFAULT 'assigned', -- assigned, at_shop, picked_up, out_for_delivery, arrived, delivered, cancelled
    picked_up_at TEXT,
    delivered_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── STORIES & REELS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'video', -- image, video
    caption TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── REFERRAL & REWARDS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    referred_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending', -- pending, completed
    reward_points INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── COMMUNITY POLLS & SURVEYS ──────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options TEXT NOT NULL, -- ["Yes", "No", ...] or [{"id": 1, "text": "..."}]
    is_pinned INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    selected_option INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id)
);

-- ─── AI CHATBOT CONVERSATIONS ────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    messages TEXT NOT NULL DEFAULT '[]',
    intent_detected TEXT,
    resolved INTEGER DEFAULT 0,
    escalated_to_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── SOCIETY MANAGEMENT ──────────────────────────────
CREATE TABLE IF NOT EXISTS society_visitors (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    resident_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    purpose TEXT,
    vehicle_number TEXT,
    qr_code TEXT,
    status TEXT DEFAULT 'expected', -- expected, checked_in, checked_out, denied
    expected_at TEXT,
    checked_in_at TEXT,
    checked_out_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_maintenance (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    flat_number TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL, -- '2026-06'
    status TEXT DEFAULT 'pending', -- pending, paid, overdue
    payment_id TEXT,
    paid_at TEXT,
    due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_complaints (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    category TEXT, -- water, electricity, parking, noise, cleaning, other
    title TEXT NOT NULL,
    description TEXT,
    photo_urls TEXT DEFAULT '[]',
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_bookings (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    facility TEXT NOT NULL, -- clubhouse, gym, pool, community_hall, parking
    booking_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose TEXT,
    status TEXT DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(society_id, facility, booking_date, start_time)
);

-- ─── CARPOOL & TRANSPORT ─────────────────────────────
CREATE TABLE IF NOT EXISTS carpool_rides (
    id TEXT PRIMARY KEY,
    driver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    from_location TEXT NOT NULL,
    from_coordinate TEXT NOT NULL,
    to_location TEXT NOT NULL,
    to_coordinate TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    price_per_seat REAL,
    vehicle_type TEXT,
    vehicle_number TEXT,
    is_recurring INTEGER DEFAULT 0,
    recurring_days TEXT, -- 'Mon,Tue,Wed,Thu,Fri'
    status TEXT DEFAULT 'active', -- active, full, completed, cancelled
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carpool_bookings (
    id TEXT PRIMARY KEY,
    ride_id TEXT REFERENCES carpool_rides(id) ON DELETE CASCADE,
    passenger_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    seats_booked INTEGER DEFAULT 1,
    status TEXT DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ride_id, passenger_id)
);

-- ─── COMMUNITY MARKETPLACE (Buy/Sell) ────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    condition TEXT, -- new, like_new, good, fair
    price REAL NOT NULL,
    is_negotiable INTEGER DEFAULT 1,
    photo_urls TEXT DEFAULT '[]',
    coordinate TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, sold, reserved, expired
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── PET COMMUNITY ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT, -- dog, cat, bird, fish, other
    breed TEXT,
    age_years INTEGER,
    gender TEXT,
    photo_url TEXT,
    vaccination_records TEXT DEFAULT '[]',
    is_lost INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pet_alerts (
    id TEXT PRIMARY KEY,
    pet_id TEXT REFERENCES pets(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL, -- lost, found, adoption
    description TEXT,
    last_seen_location TEXT,
    last_seen_coordinate TEXT,
    photo_urls TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active', -- active, resolved
    reward_amount REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── HEALTH & EMERGENCY DIRECTORY ────────────────────
CREATE TABLE IF NOT EXISTS health_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- hospital, clinic, pharmacy, lab, dentist, eye_care, vet
    specialization TEXT,
    phone TEXT,
    emergency_phone TEXT,
    address TEXT,
    coordinate TEXT NOT NULL,
    opening_hours TEXT,
    is_24x7 INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0.00,
    photo_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── LOCAL EVENTS & TICKETING ────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- workshop, sports, cultural, social, religious, other
    venue TEXT NOT NULL,
    venue_coordinate TEXT,
    event_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    is_paid INTEGER DEFAULT 0,
    ticket_price REAL,
    cover_image_url TEXT,
    photo_gallery TEXT DEFAULT '[]',
    status TEXT DEFAULT 'upcoming', -- upcoming, live, completed, cancelled
    is_approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_tickets (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    ticket_count INTEGER DEFAULT 1,
    total_price REAL,
    qr_code TEXT,
    status TEXT DEFAULT 'valid', -- valid, used, cancelled, refunded
    payment_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── SUBSCRIPTION BOX ────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    items TEXT NOT NULL, -- [{ name, qty, unit }]
    frequency TEXT NOT NULL, -- daily, weekly, biweekly, monthly
    price REAL NOT NULL,
    delivery_time TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES subscription_plans(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- active, paused, cancelled
    delivery_address TEXT,
    delivery_coordinate TEXT,
    next_delivery_date TEXT,
    total_deliveries INTEGER DEFAULT 0,
    paused_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DOCUMENT VAULT ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    document_type TEXT, -- aadhaar, pan, rent_agreement, receipt, property_doc, other
    title TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Encrypted file stored in MinIO
    encryption_key TEXT NOT NULL, -- Per-document encryption key
    is_shared INTEGER DEFAULT 0,
    shared_with TEXT REFERENCES users(id) ON DELETE SET NULL,
    share_expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── LOYALTY & GAMIFICATION ──────────────────────────
CREATE TABLE IF NOT EXISTS sampark_points (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    action TEXT NOT NULL, -- post, review, referral, delivery, event, help
    reference_id TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- naya_padosi, active_padosi, super_padosi, champion
    min_points INTEGER NOT NULL,
    perks TEXT NOT NULL,
    badge_url TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    points_spent INTEGER NOT NULL,
    reward_type TEXT, -- discount, free_delivery, shop_coupon
    reward_details TEXT,
    status TEXT DEFAULT 'redeemed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── FRANCHISE PARTNERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchise_partners (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
    territory_name TEXT NOT NULL,
    territory_pincode TEXT NOT NULL,
    territory_boundary TEXT,
    status TEXT DEFAULT 'pending',
    commission_rate REAL DEFAULT 30.00,
    total_earnings REAL DEFAULT 0.00,
    merchants_onboarded INTEGER DEFAULT 0,
    users_acquired INTEGER DEFAULT 0,
    onboarding_fee_paid INTEGER DEFAULT 0,
    agreement_signed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── REVENUE TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_reference_id TEXT,
    gross_amount REAL NOT NULL,
    platform_share REAL NOT NULL,
    franchise_share REAL DEFAULT 0,
    reward_pool_share REAL DEFAULT 0,
    reserve_share REAL DEFAULT 0,
    franchise_partner_id TEXT REFERENCES franchise_partners(id),
    region_id TEXT REFERENCES regions(id),
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DEVELOPER PAYOUTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS developer_payouts (
    id TEXT PRIMARY KEY,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_revenue REAL NOT NULL,
    developer_share REAL NOT NULL,
    payout_status TEXT DEFAULT 'pending',
    bank_reference TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── FRANCHISE PAYOUTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchise_payouts (
    id TEXT PRIMARY KEY,
    franchise_partner_id TEXT REFERENCES franchise_partners(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_territory_revenue REAL NOT NULL,
    commission_earned REAL NOT NULL,
    merchants_bonus REAL DEFAULT 0,
    users_bonus REAL DEFAULT 0,
    payout_status TEXT DEFAULT 'pending',
    upi_reference TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── USER EARNINGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_earnings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    earning_type TEXT NOT NULL,
    amount REAL NOT NULL,
    reference_id TEXT,
    description TEXT,
    status TEXT DEFAULT 'credited',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── AD CAMPAIGNS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id TEXT PRIMARY KEY,
    advertiser_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE SET NULL,
    ad_type TEXT NOT NULL,
    title TEXT,
    image_url TEXT,
    target_url TEXT,
    budget REAL NOT NULL,
    spent REAL DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── CRM LEADS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_leads (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    lead_source TEXT,
    lead_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── CRM TASKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_tasks (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES crm_leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── ADMIN ROLES (Multi-role support) ────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,  -- territory_admin, area_agent, moderator, super_admin, service_provider
    region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
    permissions TEXT DEFAULT '{}',  -- JSON: {"canApproveShops": true, "canManageUsers": true, ...}
    is_active INTEGER DEFAULT 1,
    granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
);

-- Admin PIN codes (separate from user password)
CREATE TABLE IF NOT EXISTS admin_pins (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    pin_hash TEXT NOT NULL,  -- bcrypt hashed 6-digit PIN
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Admin session audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,  -- login, logout, approve_shop, change_role, etc.
    target_type TEXT,      -- user, shop, franchise, territory
    target_id TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    details TEXT,           -- JSON with action-specific data
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- IP allowlist for admin access
CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    label TEXT,            -- "Office IP", "Home IP", etc.
    added_by TEXT REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── ADDITIONAL INDEXES ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_carpool_from ON carpool_rides (from_coordinate);
CREATE INDEX IF NOT EXISTS idx_marketplace_coords ON marketplace_listings (coordinate);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_coords ON pet_alerts (last_seen_coordinate);
CREATE INDEX IF NOT EXISTS idx_health_coords ON health_providers (coordinate);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number);
CREATE INDEX IF NOT EXISTS idx_local_shops_region ON local_shops (region_id);
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config (config_key);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions (name);
CREATE INDEX IF NOT EXISTS idx_franchise_pincode ON franchise_partners (territory_pincode);
CREATE INDEX IF NOT EXISTS idx_revenue_source ON revenue_transactions (source_type);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads (phone);
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles (user_id);

-- ─── REAL ESTATE & PROPERTIES ──────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    listing_type TEXT NOT NULL,
    price TEXT NOT NULL,
    deposit TEXT,
    beds INTEGER DEFAULT 1,
    baths INTEGER DEFAULT 1,
    sqft INTEGER,
    description TEXT,
    images TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties (location);


-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('icon_theme', 'lucide');
