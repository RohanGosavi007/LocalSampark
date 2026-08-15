-- Migration 064: Tri-Category Super-App Upgrade
-- Carpooling + Marketplace + Jobs comprehensive schema

-- ═══════════════════════════════════════════════════════════════
-- PILLAR 1: CARPOOLING & RIDE-SHARING
-- ═══════════════════════════════════════════════════════════════

-- Ensure base tables exist
CREATE TABLE IF NOT EXISTS carpool_rides (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    from_location TEXT,
    to_location TEXT,
    origin TEXT,
    destination TEXT,
    departure_time TEXT,
    estimated_arrival TEXT,
    seats_available INTEGER DEFAULT 4,
    available_seats INTEGER DEFAULT 4,
    price_per_seat REAL DEFAULT 0,
    car_model TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carpool_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id TEXT NOT NULL,
    passenger_id TEXT NOT NULL,
    seats_booked INTEGER DEFAULT 1,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ride_id, passenger_id)
);

-- Add new columns to carpool_rides
ALTER TABLE carpool_rides ADD COLUMN vehicle_id TEXT;
ALTER TABLE carpool_rides ADD COLUMN ride_type TEXT DEFAULT 'car';
ALTER TABLE carpool_rides ADD COLUMN gender_preference TEXT DEFAULT 'any';
ALTER TABLE carpool_rides ADD COLUMN is_intercity INTEGER DEFAULT 0;
ALTER TABLE carpool_rides ADD COLUMN luggage_space INTEGER DEFAULT 0;
ALTER TABLE carpool_rides ADD COLUMN route_polyline TEXT;
ALTER TABLE carpool_rides ADD COLUMN corporate_only INTEGER DEFAULT 0;
ALTER TABLE carpool_rides ADD COLUMN max_detour_km REAL DEFAULT 5;
ALTER TABLE carpool_rides ADD COLUMN estimated_distance_km REAL;
ALTER TABLE carpool_rides ADD COLUMN from_lat REAL;
ALTER TABLE carpool_rides ADD COLUMN from_lng REAL;
ALTER TABLE carpool_rides ADD COLUMN to_lat REAL;
ALTER TABLE carpool_rides ADD COLUMN to_lng REAL;
ALTER TABLE carpool_rides ADD COLUMN ride_date TEXT;
ALTER TABLE carpool_rides ADD COLUMN recurring_id TEXT;
ALTER TABLE carpool_rides ADD COLUMN fare_type TEXT DEFAULT 'fixed';

-- Add columns to carpool_bookings
ALTER TABLE carpool_bookings ADD COLUMN bid_amount REAL;
ALTER TABLE carpool_bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE carpool_bookings ADD COLUMN rated INTEGER DEFAULT 0;

-- Driver vehicles
CREATE TABLE IF NOT EXISTS carpool_vehicles (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'car',
    make TEXT,
    model TEXT,
    color TEXT,
    plate_number TEXT,
    photo_url TEXT,
    total_seats INTEGER DEFAULT 4,
    fuel_type TEXT DEFAULT 'petrol',
    is_verified INTEGER DEFAULT 0,
    verification_doc_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ride waypoints (intermediate stops)
CREATE TABLE IF NOT EXISTS carpool_ride_waypoints (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    location_name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    stop_order INTEGER DEFAULT 0,
    estimated_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- inDrive-style fare bidding
CREATE TABLE IF NOT EXISTS carpool_bids (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    bidder_id TEXT NOT NULL,
    bid_amount REAL NOT NULL,
    counter_amount REAL,
    seats_requested INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Post-ride ratings
CREATE TABLE IF NOT EXISTS carpool_ratings (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    rater_id TEXT NOT NULL,
    rated_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    role TEXT DEFAULT 'passenger',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ride_id, rater_id)
);

-- Recurring ride schedules
CREATE TABLE IF NOT EXISTS carpool_recurring_rides (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    vehicle_id TEXT,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    from_lat REAL,
    from_lng REAL,
    to_lat REAL,
    to_lng REAL,
    departure_time TEXT NOT NULL,
    days_of_week TEXT DEFAULT '1,2,3,4,5',
    seats_available INTEGER DEFAULT 3,
    price_per_seat REAL DEFAULT 0,
    ride_type TEXT DEFAULT 'car',
    gender_preference TEXT DEFAULT 'any',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emergency SOS
CREATE TABLE IF NOT EXISTS carpool_sos_alerts (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    alert_type TEXT DEFAULT 'emergency',
    message TEXT,
    status TEXT DEFAULT 'active',
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- In-ride chat
CREATE TABLE IF NOT EXISTS carpool_chat_messages (
    id TEXT PRIMARY KEY,
    ride_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Corporate verification for carpooling
CREATE TABLE IF NOT EXISTS carpool_corporate_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    corporate_email TEXT,
    corporate_name TEXT,
    govt_id_type TEXT,
    govt_id_number TEXT,
    dl_number TEXT,
    is_verified INTEGER DEFAULT 0,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for carpooling
CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver ON carpool_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_status ON carpool_rides(status);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_date ON carpool_rides(ride_date);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_geo ON carpool_rides(from_lat, from_lng, to_lat, to_lng);
CREATE INDEX IF NOT EXISTS idx_carpool_bids_ride ON carpool_bids(ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bids_bidder ON carpool_bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bookings_ride ON carpool_bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bookings_passenger ON carpool_bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_carpool_ratings_rated ON carpool_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_carpool_waypoints_ride ON carpool_ride_waypoints(ride_id);


-- ═══════════════════════════════════════════════════════════════
-- PILLAR 2: MARKETPLACE / HYPERLOCAL E-COMMERCE
-- ═══════════════════════════════════════════════════════════════

-- Ensure base table exists
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    condition TEXT DEFAULT 'Good',
    price REAL NOT NULL,
    is_negotiable INTEGER DEFAULT 1,
    photo_urls TEXT DEFAULT '[]',
    latitude REAL,
    longitude REAL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to marketplace_listings
ALTER TABLE marketplace_listings ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE marketplace_listings ADD COLUMN seller_verified INTEGER DEFAULT 0;
ALTER TABLE marketplace_listings ADD COLUMN listing_type TEXT DEFAULT 'product';
ALTER TABLE marketplace_listings ADD COLUMN delivery_available INTEGER DEFAULT 0;
ALTER TABLE marketplace_listings ADD COLUMN flash_deal_until DATETIME;
ALTER TABLE marketplace_listings ADD COLUMN zone TEXT;
ALTER TABLE marketplace_listings ADD COLUMN contact_masked TEXT;
ALTER TABLE marketplace_listings ADD COLUMN original_price REAL;
ALTER TABLE marketplace_listings ADD COLUMN sold_to TEXT;

-- Price offers / negotiations
CREATE TABLE IF NOT EXISTS marketplace_offers (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    offer_amount REAL NOT NULL,
    counter_amount REAL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat threads per listing
CREATE TABLE IF NOT EXISTS marketplace_chats (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    last_message TEXT,
    last_message_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, buyer_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS marketplace_chat_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saved / wishlist
CREATE TABLE IF NOT EXISTS marketplace_saved (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

-- Report / flag listings
CREATE TABLE IF NOT EXISTS marketplace_reports (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace categories (DB-driven)
CREATE TABLE IF NOT EXISTS marketplace_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT OR IGNORE INTO marketplace_categories (id, name, icon, display_order) VALUES
('cat_electronics', 'Electronics', '📱', 1),
('cat_furniture', 'Furniture', '🪑', 2),
('cat_appliances', 'Home Appliances', '🫧', 3),
('cat_sports', 'Sports & Fitness', '🏏', 4),
('cat_books', 'Books & Stationery', '📚', 5),
('cat_clothing', 'Clothing & Fashion', '👕', 6),
('cat_vehicles', 'Vehicles', '🚗', 7),
('cat_kitchen', 'Kitchen & Dining', '🍳', 8),
('cat_baby', 'Baby & Kids', '👶', 9),
('cat_garden', 'Garden & Outdoor', '🌿', 10),
('cat_tools', 'Tools & Hardware', '🔧', 11),
('cat_other', 'Other', '📦', 99);

-- Indexes for marketplace
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_geo ON marketplace_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_listing ON marketplace_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_buyer ON marketplace_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_saved_user ON marketplace_saved(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_listing ON marketplace_chats(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_msgs_chat ON marketplace_chat_messages(chat_id);


-- ═══════════════════════════════════════════════════════════════
-- PILLAR 3: JOBS & WORKFORCE
-- ═══════════════════════════════════════════════════════════════

-- Add new columns to local_job_postings
ALTER TABLE local_job_postings ADD COLUMN company_id TEXT;
ALTER TABLE local_job_postings ADD COLUMN experience_min INTEGER DEFAULT 0;
ALTER TABLE local_job_postings ADD COLUMN experience_max INTEGER;
ALTER TABLE local_job_postings ADD COLUMN skills_required TEXT DEFAULT '[]';
ALTER TABLE local_job_postings ADD COLUMN sector TEXT DEFAULT 'private';
ALTER TABLE local_job_postings ADD COLUMN remote_allowed INTEGER DEFAULT 0;
ALTER TABLE local_job_postings ADD COLUMN urgency TEXT DEFAULT 'normal';
ALTER TABLE local_job_postings ADD COLUMN applications_count INTEGER DEFAULT 0;
ALTER TABLE local_job_postings ADD COLUMN description_html TEXT;
ALTER TABLE local_job_postings ADD COLUMN benefits TEXT;
ALTER TABLE local_job_postings ADD COLUMN work_hours TEXT;
ALTER TABLE local_job_postings ADD COLUMN contact_email TEXT;
ALTER TABLE local_job_postings ADD COLUMN contact_phone TEXT;
ALTER TABLE local_job_postings ADD COLUMN expires_at DATETIME;

-- Add new columns to job_applications
ALTER TABLE job_applications ADD COLUMN resume_id TEXT;
ALTER TABLE job_applications ADD COLUMN match_score REAL DEFAULT 0;
ALTER TABLE job_applications ADD COLUMN stage TEXT DEFAULT 'applied';
ALTER TABLE job_applications ADD COLUMN interview_date DATETIME;
ALTER TABLE job_applications ADD COLUMN recruiter_notes TEXT;
ALTER TABLE job_applications ADD COLUMN voice_intro_url TEXT;

-- Resumes
CREATE TABLE IF NOT EXISTS job_resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    parsed_text TEXT,
    parsed_skills TEXT DEFAULT '[]',
    experience_years REAL DEFAULT 0,
    education TEXT,
    headline TEXT,
    summary TEXT,
    voice_intro_url TEXT,
    health_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Candidate skills
CREATE TABLE IF NOT EXISTS job_skills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    proficiency TEXT DEFAULT 'intermediate',
    years_experience REAL DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- Required skills per job
CREATE TABLE IF NOT EXISTS job_required_skills (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    importance TEXT DEFAULT 'required',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, skill_name)
);

-- Saved/bookmarked jobs
CREATE TABLE IF NOT EXISTS job_saved (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id)
);

-- Company profiles
CREATE TABLE IF NOT EXISTS company_profiles (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    industry TEXT,
    description TEXT,
    employee_count TEXT,
    founded_year INTEGER,
    headquarters TEXT,
    average_rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Company reviews (Glassdoor-style)
CREATE TABLE IF NOT EXISTS company_reviews (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    overall_rating INTEGER NOT NULL CHECK(overall_rating >= 1 AND overall_rating <= 5),
    work_life_rating INTEGER CHECK(work_life_rating >= 1 AND work_life_rating <= 5),
    salary_rating INTEGER CHECK(salary_rating >= 1 AND salary_rating <= 5),
    culture_rating INTEGER CHECK(culture_rating >= 1 AND culture_rating <= 5),
    management_rating INTEGER CHECK(management_rating >= 1 AND management_rating <= 5),
    title TEXT,
    pros TEXT,
    cons TEXT,
    advice TEXT,
    is_current_employee INTEGER DEFAULT 0,
    employment_status TEXT,
    job_title TEXT,
    is_anonymous INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Salary insights (anonymous)
CREATE TABLE IF NOT EXISTS job_salary_insights (
    id TEXT PRIMARY KEY,
    job_title TEXT NOT NULL,
    company_id TEXT,
    company_name TEXT,
    salary_min REAL,
    salary_max REAL,
    salary_avg REAL,
    currency TEXT DEFAULT 'INR',
    pay_period TEXT DEFAULT 'monthly',
    experience_years REAL,
    location TEXT,
    is_anonymous INTEGER DEFAULT 1,
    submitted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Interview scheduling
CREATE TABLE IF NOT EXISTS job_interviews (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    recruiter_id TEXT,
    interview_type TEXT DEFAULT 'in_person',
    scheduled_at DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    location TEXT,
    meeting_link TEXT,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job alerts
CREATE TABLE IF NOT EXISTS job_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    keywords TEXT,
    job_type TEXT,
    sector TEXT,
    min_salary REAL,
    location TEXT,
    is_active INTEGER DEFAULT 1,
    last_sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Direct recruiter-candidate chat
CREATE TABLE IF NOT EXISTS job_direct_chats (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    candidate_id TEXT NOT NULL,
    recruiter_id TEXT NOT NULL,
    last_message TEXT,
    last_message_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, candidate_id, recruiter_id)
);

CREATE TABLE IF NOT EXISTS job_chat_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed some default companies
INSERT OR IGNORE INTO company_profiles (id, name, industry, employee_count, description, is_verified) VALUES
('comp_local', 'Local Sampark', 'Technology', '50-200', 'Hyperlocal super-app platform', 1),
('comp_demo1', 'Pune Tech Solutions', 'IT Services', '10-50', 'Software development and consulting', 1),
('comp_demo2', 'Green Grocers Pvt Ltd', 'Retail', '200-500', 'Chain of neighborhood grocery stores', 1),
('comp_demo3', 'UrbanFix Services', 'Home Services', '50-200', 'On-demand home repair and maintenance', 0);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_job_postings_company ON local_job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_sector ON local_job_postings(sector);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON local_job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_stage ON job_applications(stage);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_resumes_user ON job_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_user ON job_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_job_saved_user ON job_saved(user_id);
CREATE INDEX IF NOT EXISTS idx_company_reviews_company ON company_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_job_salary_company ON job_salary_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_job_interviews_app ON job_interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_job_interviews_candidate ON job_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_job_chat_msgs_chat ON job_chat_messages(chat_id);
