// Fix migration — create missing Phase A tables individually
const { query } = require('../config/database');

const tables = [
  `CREATE TABLE IF NOT EXISTS carpool_live_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id TEXT,
    user_id TEXT,
    latitude REAL,
    longitude REAL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    recorded_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS carpool_ride_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id TEXT,
    booking_id TEXT,
    otp_code TEXT,
    verified INTEGER DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(ride_id, booking_id)
  )`,
  `CREATE TABLE IF NOT EXISTS carpool_groups (
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
    created_by TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS carpool_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT,
    user_id TEXT,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS carpool_carbon_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    ride_id TEXT,
    distance_km REAL DEFAULT 0,
    co2_saved_kg REAL DEFAULT 0,
    fuel_saved_liters REAL DEFAULT 0,
    money_saved REAL DEFAULT 0,
    logged_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_escrow (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    buyer_id TEXT,
    seller_id TEXT,
    amount REAL,
    platform_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'held',
    payment_method TEXT DEFAULT 'wallet',
    dispute_reason TEXT,
    dispute_at DATETIME,
    released_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_seller_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id TEXT UNIQUE,
    account_age_days INTEGER DEFAULT 0,
    verified_phone INTEGER DEFAULT 0,
    total_listings INTEGER DEFAULT 0,
    total_sold INTEGER DEFAULT 0,
    dispute_count INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 50,
    last_calculated DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_auctions (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    starting_price REAL,
    current_bid REAL,
    bid_increment REAL DEFAULT 50,
    highest_bidder_id TEXT,
    total_bids INTEGER DEFAULT 0,
    ends_at DATETIME,
    status TEXT DEFAULT 'active',
    winner_id TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_auction_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id TEXT,
    bidder_id TEXT,
    bid_amount REAL,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    listing_id TEXT,
    category TEXT,
    max_price REAL,
    keywords TEXT,
    is_active INTEGER DEFAULT 1,
    last_notified DATETIME,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS marketplace_chat_messages (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    sender_id TEXT,
    message TEXT,
    message_type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS job_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    keywords TEXT,
    job_type TEXT,
    sector TEXT,
    min_salary REAL,
    location TEXT,
    remote_only INTEGER DEFAULT 0,
    frequency TEXT DEFAULT 'daily',
    is_active INTEGER DEFAULT 1,
    last_sent DATETIME,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS job_skill_assessments (
    id TEXT PRIMARY KEY,
    skill_name TEXT NOT NULL,
    questions TEXT,
    passing_score INTEGER DEFAULT 60,
    time_limit_seconds INTEGER DEFAULT 300,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS job_assessment_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id TEXT,
    user_id TEXT,
    score INTEGER,
    passed INTEGER DEFAULT 0,
    answers TEXT,
    completed_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS job_referrals (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    referrer_id TEXT,
    referred_user_id TEXT,
    referral_code TEXT UNIQUE,
    bounty_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS file_uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    module TEXT,
    entity_id TEXT,
    file_name TEXT,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    mime_type TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS employer_job_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    views INTEGER DEFAULT 0,
    applications INTEGER DEFAULT 0,
    date TEXT,
    UNIQUE(job_id, date)
  )`,
  `CREATE TABLE IF NOT EXISTS job_walkin_events (
    id TEXT PRIMARY KEY,
    employer_id TEXT,
    title TEXT,
    company_name TEXT,
    location TEXT,
    lat REAL,
    lng REAL,
    event_date TEXT,
    start_time TEXT,
    end_time TEXT,
    positions TEXT,
    requirements TEXT,
    salary_range TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS carpool_recurring_rides (
    id TEXT PRIMARY KEY,
    driver_id TEXT,
    from_location TEXT,
    to_location TEXT,
    from_lat REAL,
    from_lng REAL,
    to_lat REAL,
    to_lng REAL,
    departure_time TEXT,
    seats_available INTEGER DEFAULT 3,
    price_per_seat REAL DEFAULT 0,
    ride_type TEXT DEFAULT 'car',
    gender_preference TEXT DEFAULT 'any',
    days_active TEXT DEFAULT '["Mon","Tue","Wed","Thu","Fri"]',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS company_profiles (
    id TEXT PRIMARY KEY,
    name TEXT,
    industry TEXT,
    size TEXT,
    website TEXT,
    description TEXT,
    logo_url TEXT,
    location TEXT,
    rating REAL DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS company_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT,
    user_id TEXT,
    rating INTEGER,
    review TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`
];

async function run() {
  let ok = 0, skip = 0;
  for (const sql of tables) {
    try {
      await query(sql);
      ok++;
    } catch (e) {
      if (e.message?.includes('already exists')) { skip++; }
      else { console.log('⚠️', e.message?.substring(0, 80)); skip++; }
    }
  }
  console.log(`✅ Fix migration done: ${ok} created, ${skip} already existed (total ${tables.length})`);
  process.exit(0);
}
run();
