-- Migration 065: Phase A Advanced Features
-- Socket-powered live tracking, escrow, OTP, alerts, trust scores, skill assessments

-- ═══════════════════════════════════════════════════════════════
-- CARPOOL ADVANCED
-- ═══════════════════════════════════════════════════════════════

-- Live location tracking for active rides
CREATE TABLE IF NOT EXISTS carpool_live_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    accuracy REAL DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES carpool_rides(id)
);

CREATE INDEX IF NOT EXISTS idx_carpool_live_loc_ride ON carpool_live_locations(ride_id, recorded_at DESC);

-- OTP verification for ride start
CREATE TABLE IF NOT EXISTS carpool_ride_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id TEXT NOT NULL,
    booking_id INTEGER NOT NULL,
    otp_code TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    UNIQUE(ride_id, booking_id)
);

-- Ride sharing groups (office commutes, school runs)
CREATE TABLE IF NOT EXISTS carpool_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    group_type TEXT DEFAULT 'commute',
    from_location TEXT,
    to_location TEXT,
    from_lat REAL,
    from_lng REAL,
    to_lat REAL,
    to_lng REAL,
    departure_time TEXT,
    days_active TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
    max_members INTEGER DEFAULT 20,
    created_by TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carpool_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES carpool_groups(id)
);

-- Carbon footprint tracking
CREATE TABLE IF NOT EXISTS carpool_carbon_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    ride_id TEXT,
    distance_km REAL DEFAULT 0,
    co2_saved_kg REAL DEFAULT 0,
    fuel_saved_liters REAL DEFAULT 0,
    money_saved REAL DEFAULT 0,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- MARKETPLACE ADVANCED
-- ═══════════════════════════════════════════════════════════════

-- Escrow transactions for safe pay
CREATE TABLE IF NOT EXISTS marketplace_escrow (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    amount REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'held',
    payment_method TEXT DEFAULT 'wallet',
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    held_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    released_at DATETIME,
    refunded_at DATETIME,
    dispute_reason TEXT,
    dispute_at DATETIME,
    resolved_at DATETIME,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
);

-- Seller trust scores
CREATE TABLE IF NOT EXISTS marketplace_seller_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id TEXT NOT NULL UNIQUE,
    account_age_days INTEGER DEFAULT 0,
    verified_phone INTEGER DEFAULT 0,
    verified_email INTEGER DEFAULT 0,
    verified_id INTEGER DEFAULT 0,
    total_listings INTEGER DEFAULT 0,
    total_sold INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    avg_response_time_mins REAL DEFAULT 0,
    dispute_count INTEGER DEFAULT 0,
    trust_score REAL DEFAULT 50,
    last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auction mode for listings
CREATE TABLE IF NOT EXISTS marketplace_auctions (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL UNIQUE,
    starting_price REAL NOT NULL,
    current_bid REAL DEFAULT 0,
    bid_increment REAL DEFAULT 50,
    highest_bidder_id TEXT,
    total_bids INTEGER DEFAULT 0,
    starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ends_at DATETIME NOT NULL,
    status TEXT DEFAULT 'active',
    winner_id TEXT,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
);

CREATE TABLE IF NOT EXISTS marketplace_auction_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id TEXT NOT NULL,
    bidder_id TEXT NOT NULL,
    bid_amount REAL NOT NULL,
    bid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES marketplace_auctions(id)
);

-- Price drop alerts
CREATE TABLE IF NOT EXISTS marketplace_price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    listing_id TEXT,
    category TEXT,
    max_price REAL,
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    last_notified DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to marketplace_listings
ALTER TABLE marketplace_listings ADD COLUMN listing_mode TEXT DEFAULT 'fixed';
ALTER TABLE marketplace_listings ADD COLUMN boost_until DATETIME;
ALTER TABLE marketplace_listings ADD COLUMN original_price REAL;
ALTER TABLE marketplace_listings ADD COLUMN exchange_for TEXT;

-- ═══════════════════════════════════════════════════════════════
-- JOBS ADVANCED
-- ═══════════════════════════════════════════════════════════════

-- Job alerts subscription
CREATE TABLE IF NOT EXISTS job_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    keywords TEXT,
    job_type TEXT,
    sector TEXT,
    min_salary REAL,
    location TEXT,
    remote_only INTEGER DEFAULT 0,
    frequency TEXT DEFAULT 'daily',
    is_active INTEGER DEFAULT 1,
    last_sent DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skill assessments / quizzes
CREATE TABLE IF NOT EXISTS job_skill_assessments (
    id TEXT PRIMARY KEY,
    skill_name TEXT NOT NULL,
    questions TEXT NOT NULL,
    passing_score INTEGER DEFAULT 70,
    time_limit_seconds INTEGER DEFAULT 300,
    difficulty TEXT DEFAULT 'intermediate',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_assessment_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    answers TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (assessment_id) REFERENCES job_skill_assessments(id)
);

-- Referral bounty tracking
CREATE TABLE IF NOT EXISTS job_referrals (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    referrer_id TEXT NOT NULL,
    referred_user_id TEXT,
    referral_code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending',
    bounty_amount REAL DEFAULT 0,
    bounty_paid INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    converted_at DATETIME,
    FOREIGN KEY (job_id) REFERENCES job_postings(id)
);

-- Employer dashboard analytics
CREATE TABLE IF NOT EXISTS employer_job_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    employer_id TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    applications INTEGER DEFAULT 0,
    shortlisted INTEGER DEFAULT 0,
    hired INTEGER DEFAULT 0,
    avg_match_score REAL DEFAULT 0,
    top_skills_applied TEXT,
    date TEXT NOT NULL,
    UNIQUE(job_id, date)
);

-- Walk-in interview events
CREATE TABLE IF NOT EXISTS job_walkin_events (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    latitude REAL,
    longitude REAL,
    event_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    positions_available TEXT,
    requirements TEXT,
    max_candidates INTEGER DEFAULT 50,
    registered_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to job_postings
ALTER TABLE job_postings ADD COLUMN referral_bounty REAL DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN is_walkin INTEGER DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN walkin_event_id TEXT;
ALTER TABLE job_postings ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN application_deadline TEXT;

-- Add columns to job_resumes
ALTER TABLE job_resumes ADD COLUMN video_resume_url TEXT;
ALTER TABLE job_resumes ADD COLUMN pdf_resume_url TEXT;
ALTER TABLE job_resumes ADD COLUMN parsed_data TEXT;

-- ═══════════════════════════════════════════════════════════════
-- CROSS-CUTTING: FILE UPLOADS TRACKING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS file_uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    thumbnail_path TEXT,
    is_public INTEGER DEFAULT 1,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_module ON file_uploads(module, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
