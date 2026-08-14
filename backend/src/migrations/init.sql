-- Initialize Database Schema for LocalSampark
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── REGIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'user', -- user, shop_owner, delivery_agent, moderator, admin, super_admin
    avatar_url TEXT,
    bio TEXT,
    language_preference VARCHAR(10) DEFAULT 'en',
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── ADMIN CONFIG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(200) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_category VARCHAR(50) NOT NULL,
    description TEXT,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── USER WALLETS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- credit, debit
    purpose VARCHAR(50) NOT NULL, -- order_payment, order_payout, refund, wallet_load, withdrawal, referral_bonus, reward_redemption
    reference_id UUID,
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── SOCIETIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    coordinate GEOGRAPHY(Point, 4326),
    visitor_gate_pass_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── COMMUNITY FEED (POSTS, COMMENTS, VOTES) ────────────────
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    society_id UUID REFERENCES societies(id) ON DELETE SET NULL,
    content TEXT,
    media_urls JSONB DEFAULT '[]',
    post_type VARCHAR(30) DEFAULT 'discussion', -- discussion, announcement, alert, offer, lost_found
    upvotes_count INT DEFAULT 0,
    downvotes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    coordinate GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL, -- up, down
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- ─── LOCAL SHOPS & DIRECTORY ────────────────────────────────
CREATE TABLE IF NOT EXISTS local_shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    address TEXT NOT NULL,
    coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    opening_hours JSONB, -- {"open": "09:00", "close": "21:00"}
    photo_urls JSONB DEFAULT '[]',
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    photo_urls JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, user_id)
);

-- ─── GIG ECONOMY & JOBS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    experience_years INT DEFAULT 0,
    daily_rate DECIMAL(10,2),
    availability_status VARCHAR(20) DEFAULT 'available', -- available, busy, offline
    portfolio_photos JSONB DEFAULT '[]',
    is_certified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

CREATE TABLE IF NOT EXISTS job_vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    salary_range VARCHAR(100),
    job_type VARCHAR(50) DEFAULT 'full_time', -- full_time, part_time, gig
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES job_vacancies(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cover_note TEXT,
    status VARCHAR(20) DEFAULT 'applied', -- applied, shortlisted, interviewed, hired, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── REAL ESTATE HUB ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    property_type VARCHAR(50) NOT NULL, -- flat, house, pg, commercial
    listing_type VARCHAR(20) NOT NULL, -- rent, sale
    price DECIMAL(15,2) NOT NULL,
    deposit DECIMAL(15,2),
    flat_sharing VARCHAR(20), -- for PGs: private, sharing
    gender_preference VARCHAR(20), -- male, female, family, any
    amenities JSONB DEFAULT '[]',
    photo_urls JSONB DEFAULT '[]',
    coordinate GEOGRAPHY(Point, 4326),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── DELIVERY SYSTEM ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    vehicle_type VARCHAR(50) NOT NULL, -- bicycle, motorcycle, walking
    vehicle_number VARCHAR(30),
    is_online BOOLEAN DEFAULT FALSE,
    coordinate GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES local_shops(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- cod, razorpay, wallet, upi
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
    order_status VARCHAR(30) DEFAULT 'pending', -- pending, confirmed, preparing, ready, assigned, out_for_delivery, delivered, cancelled
    delivery_address TEXT NOT NULL,
    delivery_coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    otp_code VARCHAR(6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    agent_id UUID REFERENCES delivery_agents(id) ON DELETE SET NULL,
    pickup_coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    delivery_coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    payout_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'assigned', -- assigned, at_shop, picked_up, out_for_delivery, arrived, delivered, cancelled
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── STORIES & REELS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'video', -- image, video
    caption TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── REFERRAL & REWARDS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referred_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed
    reward_points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── COMMUNITY POLLS & SURVEYS ──────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- ["Yes", "No", ...] or [{"id": 1, "text": "..."}]
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    selected_option INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id)
);

-- ─── v3-16: AI CHATBOT CONVERSATIONS ────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]',
    intent_detected VARCHAR(100),
    resolved BOOLEAN DEFAULT FALSE,
    escalated_to_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-18: SOCIETY MANAGEMENT ──────────────────────────────
CREATE TABLE IF NOT EXISTS society_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_name VARCHAR(100) NOT NULL,
    visitor_phone VARCHAR(15),
    purpose VARCHAR(100),
    vehicle_number VARCHAR(20),
    qr_code TEXT,
    status VARCHAR(20) DEFAULT 'expected', -- expected, checked_in, checked_out, denied
    expected_at TIMESTAMP WITH TIME ZONE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_out_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    flat_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    month VARCHAR(7) NOT NULL, -- '2026-06'
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue
    payment_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50), -- water, electricity, parking, noise, cleaning, other
    title VARCHAR(200) NOT NULL,
    description TEXT,
    photo_urls JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
    priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, urgent
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    facility VARCHAR(50) NOT NULL, -- clubhouse, gym, pool, community_hall, parking
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(society_id, facility, booking_date, start_time)
);

-- ─── v3-19: CARPOOL & TRANSPORT ─────────────────────────────
CREATE TABLE IF NOT EXISTS carpool_rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    from_location TEXT NOT NULL,
    from_coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    to_location TEXT NOT NULL,
    to_coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    total_seats INT NOT NULL,
    available_seats INT NOT NULL,
    price_per_seat DECIMAL(10,2),
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(20),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_days VARCHAR(50), -- 'Mon,Tue,Wed,Thu,Fri'
    status VARCHAR(20) DEFAULT 'active', -- active, full, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carpool_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID REFERENCES carpool_rides(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seats_booked INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ride_id, passenger_id)
);

-- ─── v3-20: COMMUNITY MARKETPLACE (Buy/Sell) ────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    condition VARCHAR(20), -- new, like_new, good, fair
    price DECIMAL(10,2) NOT NULL,
    is_negotiable BOOLEAN DEFAULT TRUE,
    photo_urls JSONB DEFAULT '[]',
    coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, sold, reserved, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-21: PET COMMUNITY ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(30), -- dog, cat, bird, fish, other
    breed VARCHAR(100),
    age_years INT,
    gender VARCHAR(10),
    photo_url TEXT,
    vaccination_records JSONB DEFAULT '[]',
    is_lost BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pet_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    alert_type VARCHAR(20) NOT NULL, -- lost, found, adoption
    description TEXT,
    last_seen_location TEXT,
    last_seen_coordinate GEOGRAPHY(Point, 4326),
    photo_urls JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active', -- active, resolved
    reward_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-22: HEALTH & EMERGENCY DIRECTORY ────────────────────
CREATE TABLE IF NOT EXISTS health_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(30) NOT NULL, -- hospital, clinic, pharmacy, lab, dentist, eye_care, vet
    specialization VARCHAR(100),
    phone VARCHAR(15),
    emergency_phone VARCHAR(15),
    address TEXT,
    coordinate GEOGRAPHY(Point, 4326) NOT NULL,
    opening_hours JSONB,
    is_24x7 BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-23: LOCAL EVENTS & TICKETING ────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES local_shops(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- workshop, sports, cultural, social, religious, other
    venue TEXT NOT NULL,
    venue_coordinate GEOGRAPHY(Point, 4326),
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    max_attendees INT,
    current_attendees INT DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    ticket_price DECIMAL(10,2),
    cover_image_url TEXT,
    photo_gallery JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, live, completed, cancelled
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ticket_count INT DEFAULT 1,
    total_price DECIMAL(10,2),
    qr_code TEXT,
    status VARCHAR(20) DEFAULT 'valid', -- valid, used, cancelled, refunded
    payment_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-27: SUBSCRIPTION BOX ────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    items JSONB NOT NULL, -- [{ name, qty, unit }]
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, biweekly, monthly
    price DECIMAL(10,2) NOT NULL,
    delivery_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, cancelled
    delivery_address TEXT,
    delivery_coordinate GEOGRAPHY(Point, 4326),
    next_delivery_date DATE,
    total_deliveries INT DEFAULT 0,
    paused_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-29: DOCUMENT VAULT ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50), -- aadhaar, pan, rent_agreement, receipt, property_doc, other
    title VARCHAR(200) NOT NULL,
    file_url TEXT NOT NULL, -- Encrypted file stored in MinIO
    encryption_key TEXT NOT NULL, -- Per-document encryption key
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID REFERENCES users(id) ON DELETE SET NULL,
    share_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── v3-30: LOYALTY & GAMIFICATION ──────────────────────────
CREATE TABLE IF NOT EXISTS sampark_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    points INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- post, review, referral, delivery, event, help
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- naya_padosi, active_padosi, super_padosi, champion
    min_points INT NOT NULL,
    perks JSONB NOT NULL,
    badge_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    points_spent INT NOT NULL,
    reward_type VARCHAR(50), -- discount, free_delivery, shop_coupon
    reward_details JSONB,
    status VARCHAR(20) DEFAULT 'redeemed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── FRANCHISE PARTNERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchise_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    territory_name VARCHAR(100) NOT NULL,
    territory_pincode VARCHAR(10) NOT NULL,
    territory_boundary JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    commission_rate DECIMAL(5,2) DEFAULT 30.00,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    merchants_onboarded INT DEFAULT 0,
    users_acquired INT DEFAULT 0,
    onboarding_fee_paid BOOLEAN DEFAULT FALSE,
    agreement_signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── REVENUE TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(50) NOT NULL,
    source_reference_id UUID,
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_share DECIMAL(10,2) NOT NULL,
    franchise_share DECIMAL(10,2) DEFAULT 0,
    reward_pool_share DECIMAL(10,2) DEFAULT 0,
    reserve_share DECIMAL(10,2) DEFAULT 0,
    franchise_partner_id UUID REFERENCES franchise_partners(id),
    region_id UUID REFERENCES regions(id),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── DEVELOPER PAYOUTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS developer_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    developer_share DECIMAL(12,2) NOT NULL,
    payout_status VARCHAR(20) DEFAULT 'pending',
    bank_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── FRANCHISE PAYOUTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchise_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_partner_id UUID REFERENCES franchise_partners(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_territory_revenue DECIMAL(12,2) NOT NULL,
    commission_earned DECIMAL(12,2) NOT NULL,
    merchants_bonus DECIMAL(10,2) DEFAULT 0,
    users_bonus DECIMAL(10,2) DEFAULT 0,
    payout_status VARCHAR(20) DEFAULT 'pending',
    upi_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── USER EARNINGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    earning_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_id UUID,
    description TEXT,
    status VARCHAR(20) DEFAULT 'credited',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── AD CAMPAIGNS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES local_shops(id) ON DELETE SET NULL,
    ad_type VARCHAR(30) NOT NULL,
    title VARCHAR(200),
    image_url TEXT,
    target_url TEXT,
    budget DECIMAL(10,2) NOT NULL,
    spent DECIMAL(10,2) DEFAULT 0,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── CRM LEADS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(15),
    lead_source VARCHAR(100),
    lead_score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'new',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── CRM TASKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── ADDITIONAL INDEXES ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_carpool_from ON carpool_rides USING GIST (from_coordinate);
CREATE INDEX IF NOT EXISTS idx_marketplace_coords ON marketplace_listings USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_coords ON pet_alerts USING GIST (last_seen_coordinate);
CREATE INDEX IF NOT EXISTS idx_health_coords ON health_providers USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number);
CREATE INDEX IF NOT EXISTS idx_local_shops_region ON local_shops (region_id);
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config (config_key);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions (name);
CREATE INDEX IF NOT EXISTS idx_franchise_pincode ON franchise_partners (territory_pincode);
CREATE INDEX IF NOT EXISTS idx_revenue_source ON revenue_transactions (source_type);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads (phone);

-- ─── REAL ESTATE & PROPERTIES ──────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    location TEXT NOT NULL,
    listing_type VARCHAR(50) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    deposit DECIMAL(15,2),
    beds INT DEFAULT 1,
    baths INT DEFAULT 1,
    sqft INT,
    description TEXT,
    images JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties (location);


-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (key, value) VALUES ('icon_theme', 'lucide') ON CONFLICT (key) DO NOTHING;


-- =========================================================================
-- AUTO-SYNCED POSTGRES MIGRATIONS (Appended by sync_migrations.js)
-- =========================================================================


-- =======================================
-- MIGRATION: 001_add_region_hierarchy.sqlite.sql
-- =======================================

-- Migration: Add Hierarchy and Pincode to regions table

-- Note: SQLite ALTER TABLE ADD COLUMN does not support adding multiple columns in one statement.
ALTER TABLE regions ADD COLUMN region_type TEXT NOT NULL DEFAULT 'locality';
ALTER TABLE regions ADD COLUMN parent_id TEXT REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE regions ADD COLUMN pincode TEXT;
ALTER TABLE franchise_partners ADD COLUMN region_id TEXT REFERENCES regions(id) ON DELETE SET NULL;


-- =======================================
-- MIGRATION: 003_shop_expansion.sqlite.sql
-- =======================================

-- 003_shop_expansion.sqlite.sql

-- 1. Add new columns to local_shops (SQLite requires separate ALTER statements)
ALTER TABLE local_shops ADD COLUMN shop_type TEXT DEFAULT 'retail';
ALTER TABLE local_shops ADD COLUMN approval_status TEXT DEFAULT 'pending';

-- 2. Create new tables
CREATE TABLE IF NOT EXISTS shop_staff (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    profile_image TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_appointments (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    staff_id TEXT REFERENCES shop_staff(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    items TEXT NOT NULL,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_offers (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_percentage INTEGER DEFAULT 0,
    valid_until TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- =======================================
-- MIGRATION: 008_society_management.sqlite.sql
-- =======================================

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


-- =======================================
-- MIGRATION: 009_shop_mega_upgrade.sqlite.sql
-- =======================================

-- 009_shop_mega_upgrade.sqlite.sql
-- Nearby Shops Mega-Upgrade: Categories, Services, Commissions, Staff Scheduling, Surge Pricing, QR Codes, Invoices

-- ═══════════════════════════════════════════════════════════
-- TABLE 1: shop_categories — Master category registry (Super Admin CRUD)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    business_model TEXT NOT NULL CHECK (business_model IN ('product', 'appointment', 'hybrid')),
    commission_percent REAL DEFAULT 5.0,
    convenience_fee REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    registration_fields TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 2: shop_services — Service catalog for appointment/hybrid shops
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_services (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    price REAL NOT NULL,
    is_free_for_premium INTEGER DEFAULT 0,
    image_url TEXT,
    category TEXT,
    is_available INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 3: shop_commissions — Commission ledger (revenue engine)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_commissions (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    order_id TEXT,
    order_type TEXT NOT NULL CHECK (order_type IN ('product_order', 'appointment', 'subscription')),
    gross_amount REAL NOT NULL,
    commission_percent REAL NOT NULL,
    commission_amount REAL NOT NULL,
    convenience_fee REAL DEFAULT 0.0,
    total_platform_earning REAL NOT NULL,
    net_to_shop REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'refunded')),
    settled_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 4: shop_invoices — Auto-generated invoices
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    order_id TEXT,
    order_type TEXT NOT NULL,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    convenience_fee REAL DEFAULT 0.0,
    delivery_fee REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 5: shop_qr_codes — QR codes for walk-in customers
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_qr_codes (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE UNIQUE,
    qr_data TEXT NOT NULL,
    qr_image_url TEXT,
    scan_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 6: staff_availability — Granular staff scheduling
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS staff_availability (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES shop_staff(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 30,
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, day_of_week)
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 7: staff_off_days — Leave/holiday management
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS staff_off_days (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES shop_staff(id) ON DELETE CASCADE,
    off_date TEXT NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, off_date)
);

-- ═══════════════════════════════════════════════════════════
-- TABLE 8: surge_pricing_rules — Dynamic pricing for peak slots
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS surge_pricing_rules (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    day_of_week INTEGER,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    surge_multiplier REAL DEFAULT 1.5,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════
-- ALTER: local_shops — Add location, commission, premium, delivery fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE local_shops ADD COLUMN latitude REAL;
ALTER TABLE local_shops ADD COLUMN longitude REAL;
ALTER TABLE local_shops ADD COLUMN category_id TEXT REFERENCES shop_categories(id);
ALTER TABLE local_shops ADD COLUMN commission_override_percent REAL;
ALTER TABLE local_shops ADD COLUMN convenience_fee_override REAL;
ALTER TABLE local_shops ADD COLUMN is_premium INTEGER DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN premium_expires_at TEXT;
ALTER TABLE local_shops ADD COLUMN delivery_available INTEGER DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN pickup_available INTEGER DEFAULT 1;
ALTER TABLE local_shops ADD COLUMN estimated_delivery_time TEXT;
ALTER TABLE local_shops ADD COLUMN gst_number TEXT;
ALTER TABLE local_shops ADD COLUMN bank_account TEXT;
ALTER TABLE local_shops ADD COLUMN registration_metadata TEXT;

-- ═══════════════════════════════════════════════════════════
-- ALTER: shop_staff — Add specialization, performance tracking
-- ═══════════════════════════════════════════════════════════
ALTER TABLE shop_staff ADD COLUMN specialization TEXT;
ALTER TABLE shop_staff ADD COLUMN phone_number TEXT;
ALTER TABLE shop_staff ADD COLUMN experience_years INTEGER DEFAULT 0;
ALTER TABLE shop_staff ADD COLUMN avg_rating REAL DEFAULT 0.0;
ALTER TABLE shop_staff ADD COLUMN total_bookings INTEGER DEFAULT 0;
ALTER TABLE shop_staff ADD COLUMN total_revenue REAL DEFAULT 0.0;

-- ═══════════════════════════════════════════════════════════
-- ALTER: shop_appointments — Add service reference, pricing, customer info
-- ═══════════════════════════════════════════════════════════
ALTER TABLE shop_appointments ADD COLUMN service_id TEXT REFERENCES shop_services(id);
ALTER TABLE shop_appointments ADD COLUMN service_price REAL;
ALTER TABLE shop_appointments ADD COLUMN surge_multiplier REAL DEFAULT 1.0;
ALTER TABLE shop_appointments ADD COLUMN final_price REAL;
ALTER TABLE shop_appointments ADD COLUMN customer_notes TEXT;
ALTER TABLE shop_appointments ADD COLUMN customer_name TEXT;
ALTER TABLE shop_appointments ADD COLUMN customer_phone TEXT;

-- ═══════════════════════════════════════════════════════════
-- ALTER: shop_orders — Add delivery integration, customer info
-- ═══════════════════════════════════════════════════════════
ALTER TABLE shop_orders ADD COLUMN delivery_type TEXT DEFAULT 'pickup';
ALTER TABLE shop_orders ADD COLUMN delivery_address TEXT;
ALTER TABLE shop_orders ADD COLUMN delivery_coordinate TEXT;
ALTER TABLE shop_orders ADD COLUMN delivery_fee REAL DEFAULT 0.0;
ALTER TABLE shop_orders ADD COLUMN delivery_agent_id TEXT;
ALTER TABLE shop_orders ADD COLUMN estimated_delivery_time TEXT;
ALTER TABLE shop_orders ADD COLUMN customer_name TEXT;
ALTER TABLE shop_orders ADD COLUMN customer_phone TEXT;
ALTER TABLE shop_orders ADD COLUMN tracking_otp TEXT;

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_shop_categories_slug ON shop_categories (slug);
CREATE INDEX IF NOT EXISTS idx_shop_categories_model ON shop_categories (business_model);
CREATE INDEX IF NOT EXISTS idx_shop_services_shop ON shop_services (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_commissions_shop ON shop_commissions (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_commissions_status ON shop_commissions (status);
CREATE INDEX IF NOT EXISTS idx_shop_invoices_shop ON shop_invoices (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_invoices_user ON shop_invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff ON staff_availability (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_off_days_staff ON staff_off_days (staff_id);
CREATE INDEX IF NOT EXISTS idx_surge_pricing_shop ON surge_pricing_rules (shop_id);
CREATE INDEX IF NOT EXISTS idx_local_shops_lat_lng ON local_shops (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_local_shops_category_id ON local_shops (category_id);
CREATE INDEX IF NOT EXISTS idx_local_shops_premium ON local_shops (is_premium);
CREATE INDEX IF NOT EXISTS idx_shop_orders_delivery ON shop_orders (delivery_type);

-- ═══════════════════════════════════════════════════════════
-- SEED: 39 Shop Categories
-- ═══════════════════════════════════════════════════════════

-- Product-Based Categories
INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields) VALUES
('cat_001', 'Grocery & Supermarkets', 'grocery-supermarkets', '🛒', 'product', 5.0, 10.0, 1, '[{"field":"fssai_license","label":"FSSAI License No.","type":"text","required":false}]'),
('cat_002', 'Restaurants & Cafes', 'restaurants-cafes', '🍽️', 'product', 8.0, 15.0, 2, '[{"field":"fssai_license","label":"FSSAI License No.","type":"text","required":true},{"field":"cuisine_type","label":"Cuisine Type","type":"text","required":false}]'),
('cat_003', 'Pharmacy & Healthcare', 'pharmacy-healthcare', '💊', 'product', 4.0, 5.0, 3, '[{"field":"drug_license","label":"Drug License No.","type":"text","required":true}]'),
('cat_004', 'Fresh Produce & Meat', 'fresh-produce-meat', '🥩', 'product', 5.0, 10.0, 4, '[{"field":"fssai_license","label":"FSSAI License No.","type":"text","required":false}]'),
('cat_005', 'Dairy, Sweets & Bakery', 'dairy-sweets-bakery', '🍰', 'product', 6.0, 10.0, 5, '[{"field":"fssai_license","label":"FSSAI License No.","type":"text","required":false}]'),
('cat_006', 'Stationery, Gifts & Books', 'stationery-gifts-books', '📚', 'product', 7.0, 10.0, 6, '[]'),
('cat_007', 'Florists & Nurseries', 'florists-nurseries', '💐', 'product', 8.0, 15.0, 7, '[]'),
('cat_008', 'Pet Care & Supplies', 'pet-care-supplies', '🐾', 'product', 7.0, 10.0, 8, '[]'),
('cat_009', 'Pooja Samagri & Religious', 'pooja-samagri-religious', '🪔', 'product', 5.0, 5.0, 9, '[]'),
('cat_015', 'Hardware & Sanitary', 'hardware-sanitary', '🔧', 'product', 5.0, 10.0, 15, '[]'),
('cat_016', 'Clothing & Fashion', 'clothing-fashion', '👗', 'product', 7.0, 10.0, 16, '[]');

-- Appointment-Based Categories
INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields) VALUES
('cat_011', 'Home Services & Plumbers', 'home-services-plumbers', '🔧', 'appointment', 12.0, 20.0, 11, '[{"field":"service_area_pincodes","label":"Service Area Pincodes","type":"text","required":false}]'),
('cat_012', 'Salon, Beauty & Spa', 'salon-beauty-spa', '💇', 'appointment', 10.0, 15.0, 12, '[]'),
('cat_014', 'Tutors & Education', 'tutors-education', '📖', 'appointment', 10.0, 10.0, 14, '[{"field":"qualification","label":"Qualification / Degree","type":"text","required":false}]'),
('cat_017', 'Gym & Fitness', 'gym-fitness', '💪', 'appointment', 8.0, 15.0, 17, '[{"field":"trainer_cert","label":"Trainer Certification","type":"text","required":false}]'),
('cat_018', 'Real Estate & Brokers', 'real-estate-brokers', '🏠', 'appointment', 3.0, 50.0, 18, '[{"field":"rera_registration","label":"RERA Registration No.","type":"text","required":false}]'),
('cat_020', 'Dentists & Orthodontists', 'dentists-orthodontists', '🦷', 'appointment', 10.0, 20.0, 20, '[{"field":"dental_reg","label":"Dental Registration No.","type":"text","required":true}]'),
('cat_021', 'Pathology Labs & Diagnostics', 'pathology-labs-diagnostics', '🔬', 'appointment', 15.0, 20.0, 21, '[{"field":"lab_license","label":"Lab License No.","type":"text","required":true}]'),
('cat_022', 'Physiotherapy & Chiropractic', 'physiotherapy-chiropractic', '🏥', 'appointment', 12.0, 15.0, 22, '[{"field":"practitioner_license","label":"Practitioner License","type":"text","required":true}]'),
('cat_023', 'Ayurvedic & Homeopathic', 'ayurvedic-homeopathic', '🌿', 'appointment', 10.0, 10.0, 23, '[{"field":"ayush_reg","label":"AYUSH Registration","type":"text","required":false}]'),
('cat_024', 'Pest Control Services', 'pest-control-services', '🐛', 'appointment', 12.0, 25.0, 24, '[{"field":"pest_license","label":"Pest Control License","type":"text","required":false}]'),
('cat_025', 'Deep Cleaning Services', 'deep-cleaning-services', '🧹', 'appointment', 15.0, 25.0, 25, '[]'),
('cat_026', 'AC & Appliance Repair', 'ac-appliance-repair', '❄️', 'appointment', 10.0, 20.0, 26, '[]'),
('cat_027', 'RO & Water Purifier Service', 'ro-water-purifier-service', '💧', 'appointment', 10.0, 15.0, 27, '[]'),
('cat_029', 'Tailoring & Boutiques', 'tailoring-boutiques', '🧵', 'appointment', 8.0, 10.0, 29, '[]'),
('cat_030', 'Car & Bike Wash', 'car-bike-wash', '🚗', 'appointment', 10.0, 15.0, 30, '[]'),
('cat_031', 'Driving Schools', 'driving-schools', '🚘', 'appointment', 5.0, 20.0, 31, '[{"field":"rto_affiliation","label":"RTO Affiliation","type":"text","required":false}]'),
('cat_032', 'Catering & Party Services', 'catering-party-services', '🍳', 'appointment', 8.0, 30.0, 32, '[{"field":"fssai_license","label":"FSSAI License No.","type":"text","required":false}]'),
('cat_033', 'Event Planners & Decorators', 'event-planners-decorators', '🎉', 'appointment', 10.0, 30.0, 33, '[]'),
('cat_034', 'Photographers & Videographers', 'photographers-videographers', '📸', 'appointment', 10.0, 20.0, 34, '[{"field":"portfolio_link","label":"Portfolio Link","type":"text","required":false}]'),
('cat_035', 'CAs & Tax Consultants', 'cas-tax-consultants', '📋', 'appointment', 5.0, 25.0, 35, '[{"field":"ca_membership","label":"CA Membership No.","type":"text","required":true}]'),
('cat_036', 'Lawyers & Advocates', 'lawyers-advocates', '⚖️', 'appointment', 5.0, 25.0, 36, '[{"field":"bar_council_reg","label":"Bar Council Registration","type":"text","required":true}]'),
('cat_037', 'Insurance Agents', 'insurance-agents', '🛡️', 'appointment', 5.0, 15.0, 37, '[{"field":"irda_license","label":"IRDA License No.","type":"text","required":true}]'),
('cat_038', 'Yoga & Wellness', 'yoga-wellness', '🧘', 'appointment', 8.0, 10.0, 38, '[{"field":"yoga_cert","label":"Yoga Alliance Certification","type":"text","required":false}]'),
('cat_039', 'Dieticians & Nutritionists', 'dieticians-nutritionists', '🥗', 'appointment', 10.0, 15.0, 39, '[{"field":"degree_cert","label":"Degree / Certification","type":"text","required":false}]');

-- Hybrid Categories
INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields) VALUES
('cat_010', 'Eyewear & Opticians', 'eyewear-opticians', '👓', 'hybrid', 6.0, 10.0, 10, '[{"field":"optometrist_license","label":"Optometrist License","type":"text","required":false}]'),
('cat_013', 'Electricians & Electronics', 'electricians-electronics', '⚡', 'hybrid', 8.0, 15.0, 13, '[]'),
('cat_019', 'Automotive & Mechanic', 'automotive-mechanic', '🔩', 'hybrid', 8.0, 20.0, 19, '[{"field":"workshop_license","label":"Workshop License","type":"text","required":false}]'),
('cat_028', 'Laundry & Dry Cleaning', 'laundry-dry-cleaning', '👔', 'hybrid', 8.0, 10.0, 28, '[]');


-- =======================================
-- MIGRATION: 010_add_zone_columns.sqlite.sql
-- =======================================

-- Migration: Add remaining Phase 3 columns for Zone/Region System

ALTER TABLE regions ADD COLUMN district TEXT;
ALTER TABLE regions ADD COLUMN city TEXT;
ALTER TABLE regions ADD COLUMN is_active INTEGER DEFAULT 0;
ALTER TABLE regions ADD COLUMN launch_date TEXT;
ALTER TABLE regions ADD COLUMN population_estimate INTEGER;
ALTER TABLE regions ADD COLUMN tier TEXT DEFAULT 'tier3';
ALTER TABLE regions ADD COLUMN zone_type TEXT DEFAULT 'urban';
ALTER TABLE regions ADD COLUMN local_language TEXT DEFAULT 'mr';

CREATE INDEX IF NOT EXISTS idx_regions_district ON regions (district);
CREATE INDEX IF NOT EXISTS idx_regions_pincode ON regions (pincode);
CREATE INDEX IF NOT EXISTS idx_regions_state ON regions (state);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions (is_active);

ALTER TABLE users ADD COLUMN active_zone_id TEXT REFERENCES regions(id);

CREATE TABLE IF NOT EXISTS user_saved_zones (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
  label TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, region_id)
);


-- =======================================
-- MIGRATION: 010_shop_phase2_upgrade.sqlite.sql
-- =======================================

-- Phase 2 Nearby Shops Upgrade Migration

-- 1. Batch Orders (For Multi-Shop Carts)
CREATE TABLE IF NOT EXISTS batch_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    total_batch_amount REAL NOT NULL DEFAULT 0.00,
    combined_delivery_fee REAL NOT NULL DEFAULT 0.00,
    delivery_partner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Modify Orders table (SQLite requires adding column if not exists, but we can just use ALTER TABLE)
-- Since SQLite ALTER TABLE ADD COLUMN IF NOT EXISTS is not standard until newer versions, we will try standard ALTER TABLE.
-- If it fails because column exists, it's fine.
ALTER TABLE orders ADD COLUMN batch_id TEXT REFERENCES batch_orders(id) ON DELETE SET NULL;

-- 2. Loyalty Coins
CREATE TABLE IF NOT EXISTS loyalty_accounts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sampark_coins_balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned' or 'burned'
    reference_id TEXT, -- e.g., order_id
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Shop Stories/Highlights
ALTER TABLE stories ADD COLUMN shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE;

-- 4. Shop QA & Society Verified Reviews
ALTER TABLE shop_reviews ADD COLUMN is_society_verified INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS shop_qa (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    answered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Flash Sales
CREATE TABLE IF NOT EXISTS flash_sales (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES shop_products(id) ON DELETE CASCADE,
    discount_percentage REAL NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- =======================================
-- MIGRATION: 011_delivery_system_upgrade.sqlite.sql
-- =======================================

-- ─── DELIVERY WALLET LEDGER ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_wallets (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES delivery_agents(id) ON DELETE CASCADE UNIQUE,
    balance REAL NOT NULL DEFAULT 0.00,
    total_earned REAL NOT NULL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT REFERENCES delivery_wallets(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- 'credit', 'debit'
    purpose TEXT NOT NULL, -- 'order_payout', 'incentive', 'withdrawal', 'penalty'
    reference_id TEXT, -- e.g., order_id
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DRIVER KYC ONBOARDING ──────────────────────────────────────
-- Add columns to delivery_agents table if they don't exist
ALTER TABLE delivery_agents ADD COLUMN aadhar_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN dl_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN rc_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN profile_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN dl_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN rc_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN kyc_status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'rejected'
ALTER TABLE delivery_agents ADD COLUMN full_name TEXT;

-- ─── DELIVERY ANALYTICS (Daily/Weekly/Monthly) ──────────────────
CREATE TABLE IF NOT EXISTS delivery_analytics (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES delivery_agents(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TEXT NOT NULL, -- ISO Date string '2026-07-04'
    period_end TEXT NOT NULL,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings REAL DEFAULT 0.00,
    online_hours REAL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, period_type, period_start)
);


-- =======================================
-- MIGRATION: 012_enterprise_delivery_upgrade.sqlite.sql
-- =======================================

-- 012_enterprise_delivery_upgrade.sqlite.sql

-- 1. Delivery Batches: For grouping multiple orders to one agent
CREATE TABLE IF NOT EXISTS delivery_batches (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    zone_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed
    total_amount REAL DEFAULT 0,
    estimated_eta_mins INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES delivery_agents(id)
);

-- 2. Delivery Jobs (Ensure it exists)
CREATE TABLE IF NOT EXISTS delivery_jobs (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    shop_order_id TEXT,
    requester_id TEXT,
    assigned_agent_id TEXT REFERENCES delivery_agents(id),
    pickup_location TEXT,
    dropoff_location TEXT,
    item_details TEXT,
    delivery_type TEXT,
    payment_pref TEXT,
    price_fiat REAL DEFAULT 0,
    price_coins INTEGER DEFAULT 0,
    surge_multiplier REAL DEFAULT 1.0,
    pincode TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- In SQLite, we can just do this if the table exists, but if we just created it with the columns above, 
-- we don't need ALTER TABLE for new setups, but for existing ones:
-- ALTER TABLE delivery_jobs ADD COLUMN batch_id TEXT;
-- ALTER TABLE delivery_jobs ADD COLUMN surge_multiplier REAL DEFAULT 1.0;

-- 3. High-Frequency Telemetry
CREATE TABLE IF NOT EXISTS delivery_telemetry (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    battery_level INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES delivery_agents(id)
);

-- 4. Dynamic Incentives & Surge Pricing configurations per zone
CREATE TABLE IF NOT EXISTS delivery_incentives (
    id TEXT PRIMARY KEY,
    zone_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'rain', 'peak_hours', 'high_demand'
    multiplier REAL DEFAULT 1.0,
    flat_bonus REAL DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    is_active INTEGER DEFAULT 1
);


-- =======================================
-- MIGRATION: 013_engagement_engines.sqlite.sql
-- =======================================

-- 013_engagement_engines.sqlite.sql

-- 1. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referee_id TEXT,
    referral_code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending', -- pending, completed
    reward_issued INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referee_id) REFERENCES users(id)
);

-- 2. Reward Coins Ledger
CREATE TABLE IF NOT EXISTS reward_coins_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL, -- Number of coins (100 coins = 10 rupees)
    transaction_type TEXT NOT NULL, -- 'earned_referral', 'spent_on_order', 'earned_cashback'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ensure users have a total_coins column
-- ALTER TABLE users ADD COLUMN total_coins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN my_referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(my_referral_code);

-- 3. Reviews and Ratings
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_id TEXT NOT NULL, -- Can be shop_id, agent_id, or service_id
    target_type TEXT NOT NULL, -- 'shop', 'agent', 'service'
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- =======================================
-- MIGRATION: 014_godtier_society_management.sqlite.sql
-- =======================================

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


-- =======================================
-- MIGRATION: 015_delivery_fleet.sqlite.sql
-- =======================================

-- Phase 9: Merchant Ecosystem & Hyperlocal Delivery Fleet

CREATE TABLE IF NOT EXISTS delivery_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    region_id TEXT NOT NULL,
    vehicle_number TEXT,
    status TEXT DEFAULT 'offline', -- 'offline', 'available', 'busy'
    current_lat REAL,
    current_lng REAL,
    rating REAL DEFAULT 5.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(region_id) REFERENCES regions(id)
);

CREATE TABLE IF NOT EXISTS order_dispatch (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    agent_id TEXT,
    pickup_time TEXT,
    delivery_time TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'picked_up', 'delivered', 'failed'
    earnings REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES delivery_agents(id)
);

CREATE TABLE IF NOT EXISTS agent_payouts (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    amount REAL NOT NULL,
    week_ending TEXT,
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES delivery_agents(id)
);


-- =======================================
-- MIGRATION: 016_enhanced_shop_management.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 016_enhanced_shop_management.sqlite.sql
-- Enhanced Shop Management System: 16 New Categories, Extended State Machines,
-- Disputes, Returns, Notifications, Chat, Payouts, Job Cards, Tiffin Subscriptions
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: 16 NEW ESSENTIAL SHOP CATEGORIES
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields) VALUES
-- Hybrid Categories (New)
('cat_040', 'Tiffin & Meal Subscription', 'tiffin-meal-subscription', '🍱', 'hybrid', 8.0, 15.0, 40, '[{"field":"fssai_license","label":"FSSAI License No.","type":"text","required":true},{"field":"cuisine_type","label":"Cuisine Type","type":"text","required":false}]'),
('cat_041', 'Mobile & Computer Repair', 'mobile-computer-repair', '📱', 'hybrid', 10.0, 20.0, 41, '[{"field":"gst_number","label":"GST Number","type":"text","required":false}]'),
('cat_044', 'Printing, Xerox & DTP', 'printing-xerox-dtp', '🖨️', 'hybrid', 8.0, 10.0, 44, '[]'),
('cat_053', 'Security & CCTV', 'security-cctv', '🛡️', 'hybrid', 8.0, 20.0, 53, '[{"field":"security_license","label":"Security Agency License","type":"text","required":false}]'),

-- Product Categories (New)
('cat_042', 'Courier & Parcel Services', 'courier-parcel-services', '📦', 'product', 5.0, 10.0, 42, '[{"field":"courier_partner","label":"Courier Partner (if any)","type":"text","required":false}]'),
('cat_047', 'Water Tanker & Supply', 'water-tanker-supply', '🚰', 'product', 5.0, 5.0, 47, '[]'),
('cat_048', 'Gas Cylinder & LPG', 'gas-cylinder-lpg', '🔥', 'product', 3.0, 5.0, 48, '[{"field":"gas_agency_license","label":"Gas Agency License","type":"text","required":true}]'),
('cat_049', 'Jewellery & Gold', 'jewellery-gold', '💎', 'product', 3.0, 10.0, 49, '[{"field":"bis_hallmark","label":"BIS Hallmark License","type":"text","required":false},{"field":"gst_number","label":"GST Number","type":"text","required":true}]'),

-- Appointment Categories (New)
('cat_043', 'Travel Agents & Visa', 'travel-agents-visa', '✈️', 'appointment', 5.0, 25.0, 43, '[{"field":"iata_code","label":"IATA Code (if applicable)","type":"text","required":false}]'),
('cat_045', 'Locksmith & Key Maker', 'locksmith-key-maker', '🔑', 'appointment', 10.0, 15.0, 45, '[]'),
('cat_046', 'Packers & Movers', 'packers-movers', '🚚', 'appointment', 5.0, 30.0, 46, '[{"field":"transport_license","label":"Transport License","type":"text","required":false}]'),
('cat_050', 'Wedding & Party Planner', 'wedding-party-planner', '💒', 'appointment', 8.0, 30.0, 50, '[{"field":"portfolio_link","label":"Portfolio Link","type":"text","required":false}]'),
('cat_051', 'Interior Design & Decor', 'interior-design-decor', '🎨', 'appointment', 8.0, 25.0, 51, '[{"field":"portfolio_link","label":"Portfolio Link","type":"text","required":false}]'),
('cat_052', 'Painting & Renovation', 'painting-renovation', '🎨', 'appointment', 10.0, 20.0, 52, '[]'),
('cat_054', 'Coaching & Test Prep', 'coaching-test-prep', '🎓', 'appointment', 8.0, 15.0, 54, '[{"field":"center_affiliation","label":"Board/University Affiliation","type":"text","required":false}]'),
('cat_055', 'Astrologer & Pandit', 'astrologer-pandit', '🪷', 'appointment', 5.0, 10.0, 55, '[]');


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: SHOP DISPUTES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_disputes (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    order_id TEXT,
    appointment_id TEXT,
    initiator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    initiator_role TEXT NOT NULL CHECK (initiator_role IN ('visitor', 'shop_owner')),
    category TEXT NOT NULL CHECK (category IN ('wrong_item', 'quality_issue', 'late_delivery', 'overcharge', 'rude_behavior', 'no_show', 'damage', 'other')),
    description TEXT NOT NULL,
    photo_urls TEXT DEFAULT '[]',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed', 'escalated')),
    resolution TEXT,
    admin_notes TEXT,
    resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_disputes_shop ON shop_disputes (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_disputes_status ON shop_disputes (status);
CREATE INDEX IF NOT EXISTS idx_shop_disputes_initiator ON shop_disputes (initiator_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: SHOP RETURNS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('wrong_item', 'damaged', 'not_as_described', 'expired', 'change_of_mind', 'other')),
    description TEXT,
    photo_urls TEXT DEFAULT '[]',
    return_items TEXT DEFAULT '[]',
    refund_amount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'pickup_scheduled', 'picked_up', 'refunded', 'rejected')),
    pickup_date TEXT,
    pickup_agent_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_returns_order ON shop_returns (order_id);
CREATE INDEX IF NOT EXISTS idx_shop_returns_shop ON shop_returns (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_returns_status ON shop_returns (status);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: NOTIFICATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('order_update', 'appointment_reminder', 'appointment_update', 'dispute_update', 'payout_settled', 'new_review', 'chat_message', 'flash_sale', 'return_update', 'system', 'promotion')),
    title TEXT NOT NULL,
    body TEXT,
    data TEXT DEFAULT '{}',
    is_read INTEGER DEFAULT 0,
    action_url TEXT,
    icon TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_notifications_recipient ON shop_notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_shop_notifications_read ON shop_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_shop_notifications_type ON shop_notifications (type);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: CHAT MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_chat_messages (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'order_card', 'appointment_card')),
    reference_id TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_chat_shop ON shop_chat_messages (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_chat_sender ON shop_chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_shop_chat_receiver ON shop_chat_messages (receiver_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: WALK-IN SCANS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_walkin_scans (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    visitor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    scan_source TEXT DEFAULT 'qr' CHECK (scan_source IN ('qr', 'nfc', 'manual')),
    scanned_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_walkin_shop ON shop_walkin_scans (shop_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: SHOP OWNER PAYOUTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_owner_payouts (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_gross REAL DEFAULT 0.0,
    total_commission REAL DEFAULT 0.0,
    total_convenience_fee REAL DEFAULT 0.0,
    net_payout REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'settled', 'failed')),
    bank_reference TEXT,
    settled_at TEXT,
    settled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_payouts_shop ON shop_owner_payouts (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_status ON shop_owner_payouts (status);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: TIFFIN SUBSCRIPTION SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tiffin_plans (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner', 'both', 'breakfast')),
    diet_type TEXT DEFAULT 'veg' CHECK (diet_type IN ('veg', 'non_veg', 'jain', 'vegan', 'mixed')),
    price_daily REAL NOT NULL,
    price_weekly REAL,
    price_monthly REAL,
    includes TEXT DEFAULT '[]',
    is_trial_available INTEGER DEFAULT 0,
    trial_days INTEGER DEFAULT 1,
    trial_price REAL DEFAULT 0,
    max_subscribers INTEGER DEFAULT 100,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiffin_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT REFERENCES tiffin_plans(id) ON DELETE CASCADE,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('daily', 'weekly', 'monthly', 'trial')),
    delivery_address TEXT NOT NULL,
    delivery_coordinate TEXT,
    delivery_instructions TEXT,
    dietary_preferences TEXT DEFAULT '[]',
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired', 'trial')),
    pause_start TEXT,
    pause_end TEXT,
    delivery_mode TEXT DEFAULT 'shop_delivery' CHECK (delivery_mode IN ('shop_delivery', 'platform_delivery', 'pickup')),
    auto_renew INTEGER DEFAULT 1,
    payment_method TEXT DEFAULT 'prepaid',
    total_paid REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiffin_daily_menu (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES tiffin_plans(id) ON DELETE CASCADE,
    menu_date TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner', 'breakfast')),
    items TEXT NOT NULL DEFAULT '[]',
    special_note TEXT,
    calories_estimate INTEGER,
    is_published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, plan_id, menu_date, meal_type)
);

CREATE TABLE IF NOT EXISTS tiffin_deliveries (
    id TEXT PRIMARY KEY,
    subscription_id TEXT REFERENCES tiffin_subscriptions(id) ON DELETE CASCADE,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    delivery_date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'preparing', 'dispatched', 'delivered', 'skipped', 'cancelled')),
    delivery_mode TEXT DEFAULT 'shop_delivery',
    delivery_agent_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    delivered_at TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tiffin_plans_shop ON tiffin_plans (shop_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_subs_user ON tiffin_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_subs_shop ON tiffin_subscriptions (shop_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_deliveries_date ON tiffin_deliveries (delivery_date);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: RESTAURANT ADVANCED FEATURES (Better than Swiggy/Zomato)
-- ═══════════════════════════════════════════════════════════════════════════

-- Table Management (Dine-in)
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    section TEXT DEFAULT 'main',
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    qr_code TEXT,
    current_order_id TEXT,
    occupied_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, table_number)
);

-- Kitchen Display System (KDS) Tickets
CREATE TABLE IF NOT EXISTS kds_tickets (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    special_instructions TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'rush', 'vip')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served', 'cancelled')),
    prep_started_at TEXT,
    ready_at TEXT,
    served_at TEXT,
    assigned_station TEXT,
    estimated_prep_minutes INTEGER DEFAULT 15,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Menu Customization Options
CREATE TABLE IF NOT EXISTS menu_customizations (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES shop_products(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    group_type TEXT DEFAULT 'single' CHECK (group_type IN ('single', 'multiple')),
    is_required INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    options TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table Reservations
CREATE TABLE IF NOT EXISTS table_reservations (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    table_id TEXT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    reservation_date TEXT NOT NULL,
    reservation_time TEXT NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 2,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    special_requests TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
    reminder_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Order Customizations (per order item — spice level, extras, etc.)
CREATE TABLE IF NOT EXISTS order_item_customizations (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT REFERENCES shop_products(id) ON DELETE CASCADE,
    customization_id TEXT REFERENCES menu_customizations(id) ON DELETE SET NULL,
    selected_options TEXT NOT NULL DEFAULT '[]',
    extra_charge REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily Specials
CREATE TABLE IF NOT EXISTS daily_specials (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES shop_products(id) ON DELETE CASCADE,
    special_date TEXT NOT NULL,
    original_price REAL NOT NULL,
    special_price REAL NOT NULL,
    max_quantity INTEGER,
    sold_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_shop ON restaurant_tables (shop_id);
CREATE INDEX IF NOT EXISTS idx_kds_tickets_shop ON kds_tickets (shop_id);
CREATE INDEX IF NOT EXISTS idx_kds_tickets_status ON kds_tickets (status);
CREATE INDEX IF NOT EXISTS idx_table_reservations_shop ON table_reservations (shop_id);
CREATE INDEX IF NOT EXISTS idx_table_reservations_date ON table_reservations (reservation_date);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10: JOB CARD SYSTEM (Garage, Repair, Laundry)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS job_cards (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    job_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT,
    item_identifier TEXT,
    item_photos TEXT DEFAULT '[]',
    status TEXT DEFAULT 'received' CHECK (status IN ('received', 'inspection', 'estimate_sent', 'approved', 'in_repair', 'quality_check', 'ready', 'delivered', 'cancelled')),
    estimated_cost REAL,
    final_cost REAL,
    estimate_items TEXT DEFAULT '[]',
    customer_approved INTEGER DEFAULT 0,
    customer_approved_at TEXT,
    pickup_requested INTEGER DEFAULT 0,
    pickup_scheduled_at TEXT,
    drop_requested INTEGER DEFAULT 0,
    drop_scheduled_at TEXT,
    warranty_days INTEGER DEFAULT 0,
    warranty_expires_at TEXT,
    progress_photos TEXT DEFAULT '[]',
    technician_notes TEXT,
    assigned_to TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_cards_shop ON job_cards (shop_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_customer ON job_cards (customer_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards (status);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11: QUOTATION SYSTEM (Home Services, Events, Professional)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS service_quotations (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    service_request_description TEXT NOT NULL,
    service_photos TEXT DEFAULT '[]',
    service_address TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    labour_charge REAL DEFAULT 0.0,
    material_charge REAL DEFAULT 0.0,
    total_amount REAL NOT NULL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    final_amount REAL NOT NULL DEFAULT 0.0,
    validity_days INTEGER DEFAULT 7,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'completed')),
    customer_notes TEXT,
    before_photos TEXT DEFAULT '[]',
    after_photos TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_shop ON service_quotations (shop_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON service_quotations (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON service_quotations (status);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12: VISITOR FAVORITES & ORDER HISTORY
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shop_favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, shop_id)
);

CREATE TABLE IF NOT EXISTS shop_wishlists (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES shop_products(id) ON DELETE CASCADE,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON shop_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON shop_wishlists (user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 13: GAMIFICATION & LOYALTY ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_icon TEXT,
    description TEXT,
    earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS daily_rewards (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reward_date TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('spin_wheel', 'daily_login', 'streak_bonus', 'challenge_complete')),
    reward_value REAL DEFAULT 0,
    reward_description TEXT,
    is_claimed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, reward_date, reward_type)
);

CREATE TABLE IF NOT EXISTS locality_challenges (
    id TEXT PRIMARY KEY,
    region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('order_count', 'category_explore', 'review_write', 'referral', 'spending')),
    target_value INTEGER NOT NULL DEFAULT 3,
    reward_coins INTEGER NOT NULL DEFAULT 100,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    challenge_id TEXT REFERENCES locality_challenges(id) ON DELETE CASCADE,
    current_progress INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    reward_claimed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user ON daily_rewards (user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_region ON locality_challenges (region_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 14: FILE UPLOADS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS file_uploads (
    id TEXT PRIMARY KEY,
    uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    purpose TEXT DEFAULT 'general' CHECK (purpose IN ('product_image', 'shop_photo', 'profile_photo', 'prescription', 'document', 'review_photo', 'job_card_photo', 'chat_image', 'general')),
    reference_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploads_uploader ON file_uploads (uploader_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 15: ALTER EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Extend local_shops with management archetype
ALTER TABLE local_shops ADD COLUMN management_archetype TEXT;
ALTER TABLE local_shops ADD COLUMN busy_status TEXT DEFAULT 'normal' CHECK (busy_status IN ('not_busy', 'normal', 'moderate', 'very_busy'));
ALTER TABLE local_shops ADD COLUMN avg_wait_minutes INTEGER DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN dine_in_available INTEGER DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN self_delivery_available INTEGER DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN accepts_walkin INTEGER DEFAULT 1;

-- Extend shop_appointments with enhanced tracking
ALTER TABLE shop_appointments ADD COLUMN check_in_status TEXT DEFAULT 'pending' CHECK (check_in_status IN ('pending', 'checked_in', 'in_progress', 'completed', 'no_show'));
ALTER TABLE shop_appointments ADD COLUMN no_show INTEGER DEFAULT 0;
ALTER TABLE shop_appointments ADD COLUMN reschedule_count INTEGER DEFAULT 0;
ALTER TABLE shop_appointments ADD COLUMN original_appointment_id TEXT;
ALTER TABLE shop_appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0;

-- Extend shop_orders with enhanced states
ALTER TABLE shop_orders ADD COLUMN order_type TEXT DEFAULT 'online' CHECK (order_type IN ('online', 'walkin', 'phone', 'dine_in', 'qr_order'));
ALTER TABLE shop_orders ADD COLUMN table_id TEXT;
ALTER TABLE shop_orders ADD COLUMN preparation_time_minutes INTEGER;
ALTER TABLE shop_orders ADD COLUMN accepted_at TEXT;
ALTER TABLE shop_orders ADD COLUMN preparing_at TEXT;
ALTER TABLE shop_orders ADD COLUMN ready_at TEXT;
ALTER TABLE shop_orders ADD COLUMN tip_amount REAL DEFAULT 0.0;
ALTER TABLE shop_orders ADD COLUMN special_instructions TEXT;

-- Extend shop_products with advanced fields
ALTER TABLE shop_products ADD COLUMN category TEXT;
ALTER TABLE shop_products ADD COLUMN subcategory TEXT;
ALTER TABLE shop_products ADD COLUMN dietary_tags TEXT DEFAULT '[]';
ALTER TABLE shop_products ADD COLUMN variants TEXT DEFAULT '[]';
ALTER TABLE shop_products ADD COLUMN sku TEXT;
ALTER TABLE shop_products ADD COLUMN barcode TEXT;
ALTER TABLE shop_products ADD COLUMN stock_quantity INTEGER DEFAULT -1;
ALTER TABLE shop_products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE shop_products ADD COLUMN unit TEXT DEFAULT 'piece';
ALTER TABLE shop_products ADD COLUMN weight_grams REAL;
ALTER TABLE shop_products ADD COLUMN is_featured INTEGER DEFAULT 0;
ALTER TABLE shop_products ADD COLUMN preparation_time_minutes INTEGER;
ALTER TABLE shop_products ADD COLUMN calories INTEGER;
ALTER TABLE shop_products ADD COLUMN allergens TEXT DEFAULT '[]';
ALTER TABLE shop_products ADD COLUMN display_order INTEGER DEFAULT 0;

-- Extend shop_staff with more fields
ALTER TABLE shop_staff ADD COLUMN bio TEXT;
ALTER TABLE shop_staff ADD COLUMN portfolio_photos TEXT DEFAULT '[]';
ALTER TABLE shop_staff ADD COLUMN commission_percent REAL DEFAULT 0.0;

-- Extend shop_reviews with owner response
ALTER TABLE shop_reviews ADD COLUMN owner_response TEXT;
ALTER TABLE shop_reviews ADD COLUMN owner_responded_at TEXT;
ALTER TABLE shop_reviews ADD COLUMN is_flagged INTEGER DEFAULT 0;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 16: VIEWS FOR CONVENIENCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Unified Order History View (orders + appointments for a user)
CREATE VIEW IF NOT EXISTS visitor_order_history AS
SELECT
    o.id,
    'product_order' as type,
    o.shop_id,
    s.name as shop_name,
    s.category_id,
    sc.name as category_name,
    sc.icon as category_icon,
    o.user_id,
    o.total_amount as amount,
    o.status,
    o.delivery_type,
    o.created_at,
    NULL as service_name,
    NULL as staff_name,
    NULL as appointment_date,
    NULL as time_slot
FROM shop_orders o
LEFT JOIN local_shops s ON o.shop_id = s.id
LEFT JOIN shop_categories sc ON s.category_id = sc.id

UNION ALL

SELECT
    a.id,
    'appointment' as type,
    a.shop_id,
    s.name as shop_name,
    s.category_id,
    sc.name as category_name,
    sc.icon as category_icon,
    a.user_id,
    a.final_price as amount,
    a.status,
    NULL as delivery_type,
    a.created_at,
    sv.name as service_name,
    st.name as staff_name,
    a.appointment_date,
    a.time_slot
FROM shop_appointments a
LEFT JOIN local_shops s ON a.shop_id = s.id
LEFT JOIN shop_categories sc ON s.category_id = sc.id
LEFT JOIN shop_services sv ON a.service_id = sv.id
LEFT JOIN shop_staff st ON a.staff_id = st.id;


-- =======================================
-- MIGRATION: 017_scrap_pickups.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS scrap_pickups (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    address TEXT,
    preferred_time TEXT,
    estimated_weight TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =======================================
-- MIGRATION: 018_ecommerce_unification.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    session_id TEXT NULL,
    user_id INTEGER NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',
    total_amount REAL NOT NULL,
    delivery_fee REAL DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    delivery_lat REAL NULL,
    delivery_lng REAL NULL,
    payment_method TEXT DEFAULT 'COD',
    payment_status TEXT DEFAULT 'PENDING',
    payment_id TEXT NULL,
    fulfillment_method TEXT DEFAULT 'DELIVERY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES local_shops(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_buy REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS order_tracking (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE,
    runner_id INTEGER NULL,
    current_lat REAL NULL,
    current_lng REAL NULL,
    estimated_arrival TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);


-- =======================================
-- MIGRATION: 019_ecommerce_pro.sqlite.sql
-- =======================================

-- E-Commerce Advanced Capabilities

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    variant_name TEXT NOT NULL, -- e.g., "Color", "Size"
    variant_value TEXT NOT NULL, -- e.g., "Red", "XL"
    sku TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0.00,
    inventory_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES shop_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    address_type TEXT NOT NULL DEFAULT 'home', -- e.g. 'home', 'work', 'other'
    full_name TEXT,
    phone_number TEXT,
    street_address TEXT NOT NULL,
    apartment_suite TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add advanced ecommerce fields to shop_products
-- (Note: SQLite ALTER TABLE ADD COLUMN does not support constraints or defaults in one step nicely for all types, but basic columns work)
ALTER TABLE shop_products ADD COLUMN inventory_count INTEGER DEFAULT 0;
ALTER TABLE shop_products ADD COLUMN sku TEXT;
ALTER TABLE shop_products ADD COLUMN track_inventory INTEGER DEFAULT 1;
ALTER TABLE shop_products ADD COLUMN category_id TEXT;


-- =======================================
-- MIGRATION: 020_phase2_admin.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS medical_providers (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    type TEXT NOT NULL,
    license_no TEXT,
    zone TEXT,
    status TEXT DEFAULT 'pending',
    is_verified INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dummy data to populate the tables for demo
INSERT OR IGNORE INTO medical_providers (id, provider_name, type, license_no, zone, status, is_verified) 
VALUES 
('med_1', 'Dr. Sharma Clinic', 'Clinic', 'MED-12345', 'North Zone', 'active', 1),
('med_2', 'City Pharmacy', 'Pharmacy', 'PHM-98765', 'East Zone', 'active', 1),
('med_3', 'HealthFirst Lab', 'Diagnostic', 'DIA-55555', 'South Zone', 'pending', 0);

INSERT OR IGNORE INTO crm_leads (id, first_name, last_name, phone, lead_source, status) 
VALUES 
('lead_1', 'Rajesh', 'Kumar', '+919876543210', 'Website Inquiry', 'new'),
('lead_2', 'Sneha', 'Patel', '+919876543211', 'Referral', 'contacted'),
('lead_3', 'Amit', 'Singh', '+919876543212', 'Social Media', 'converted');


-- =======================================
-- MIGRATION: 021_saas_crm.sqlite.sql
-- =======================================

-- Migration: Add SaaS CRM Tables

CREATE TABLE IF NOT EXISTS saas_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly REAL NOT NULL,
    stripe_product_id TEXT,
    features_json TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_subscriptions (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES saas_plans(id),
    status TEXT DEFAULT 'pending',
    current_period_end TEXT,
    gateway_subscription_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    processed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alter local_shops to include CRM constraints
ALTER TABLE local_shops ADD COLUMN crm_tier TEXT DEFAULT 'free';
ALTER TABLE local_shops ADD COLUMN is_locked INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_subs_shop ON vendor_subscriptions (shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subs_status ON vendor_subscriptions (status);


-- =======================================
-- MIGRATION: 022_gtm_feature_flags.sqlite.sql
-- =======================================

-- Migration: 022_gtm_feature_flags.sqlite.sql

CREATE TABLE IF NOT EXISTS feature_flags (
    feature_key TEXT PRIMARY KEY,
    phase INTEGER NOT NULL,
    is_enabled INTEGER DEFAULT 0,
    allowed_pincodes_json TEXT DEFAULT '[]',
    title TEXT NOT NULL,
    description TEXT,
    coming_soon_headline TEXT,
    coming_soon_message TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial 10x GTM Rollout Matrix
-- Phase 1 (The Wedge): Neighborhood Shops & Society Management (Active by default)
INSERT OR IGNORE INTO feature_flags (feature_key, phase, is_enabled, title, description, coming_soon_headline, coming_soon_message) VALUES
('neighborhood_shops', 1, 1, 'Neighborhood Shops', 'Hyperlocal local store ordering & delivery', 'Shops Coming Soon', 'We are onboarding your local neighborhood stores.'),
('society_management', 1, 1, 'Society Management', 'Gatekeeper, notices, maintenance & community management', 'Society Portal Coming Soon', 'Society management features are being enabled for your complex.');

-- Phase 2 (The Expansion): Home Services & Medical (Locked by default)
INSERT OR IGNORE INTO feature_flags (feature_key, phase, is_enabled, title, description, coming_soon_headline, coming_soon_message) VALUES
('home_services', 2, 0, 'Home Services', 'Plumbers, electricians, cleaners & technicians', 'Home Services Launching Soon!', 'We are handpicking verified local plumbers, electricians, and technicians in your area.'),
('medical', 2, 0, 'Medical & Health', 'Doctor appointments, local pharmacies & diagnostics', 'Medical Care Coming Soon!', 'Local pharmacies and clinic booking will be available in your pincode soon.');

-- Phase 3 (The Super-App): Jobs, Properties, Events, Multilingual (Locked by default)
INSERT OR IGNORE INTO feature_flags (feature_key, phase, is_enabled, title, description, coming_soon_headline, coming_soon_message) VALUES
('jobs', 3, 0, 'Local Jobs', 'Hyperlocal job postings and candidate matching', 'Local Job Portal Arriving Soon!', 'Find jobs within 5km of your location soon.'),
('properties', 3, 0, 'Properties', 'Buy, sell, and rent local real estate without brokers', 'Local Real Estate Coming Soon!', 'Direct buyer-to-owner property listings are preparing to launch.'),
('events', 3, 0, 'Community Events', 'Local gatherings, workshops, and society events', 'Local Events Coming Soon!', 'Discover workshops and events happening in your neighborhood soon.'),
('multilingual', 3, 0, 'Regional Languages', 'Support for regional local languages', 'Regional Languages Coming Soon!', 'Native language support will be enabled in an upcoming release.');


-- =======================================
-- MIGRATION: 023_home_services.sqlite.sql
-- =======================================

-- Migration: 023_home_services.sqlite.sql

-- Feature Interest Leads (Logged when users tap 'Notify Me' on ComingSoonModal)
CREATE TABLE IF NOT EXISTS feature_interest_leads (
    id TEXT PRIMARY KEY,
    feature_key TEXT NOT NULL,
    pincode TEXT,
    user_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Home Service Categories (Plumbing, Electrical, AC Repair, Cleaning, Carpentry)
CREATE TABLE IF NOT EXISTS home_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    base_inspection_fee REAL DEFAULT 199.00,
    is_active INTEGER DEFAULT 1
);

-- Service Technicians / Providers
CREATE TABLE IF NOT EXISTS home_service_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    shop_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    category_id TEXT NOT NULL,
    experience_years INTEGER DEFAULT 1,
    hourly_rate REAL NOT NULL,
    rating REAL DEFAULT 5.0,
    total_jobs INTEGER DEFAULT 0,
    serviced_pincodes_json TEXT DEFAULT '[]',
    is_verified INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES home_service_categories(id)
);

-- Home Service Bookings
CREATE TABLE IF NOT EXISTS home_service_bookings (
    id TEXT PRIMARY KEY,
    booking_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    service_address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    problem_description TEXT,
    status TEXT DEFAULT 'pending',
    inspection_fee REAL NOT NULL,
    total_amount REAL,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(provider_id) REFERENCES home_service_providers(id),
    FOREIGN KEY(category_id) REFERENCES home_service_categories(id)
);

-- Seed Default Categories
INSERT OR IGNORE INTO home_service_categories (id, name, icon, description, base_inspection_fee) VALUES
('cat_plumbing', 'Plumbing & Pipe Repair', 'wrench', 'Fix leaks, blockages, taps, and sanitary fittings', 199.00),
('cat_electrical', 'Electrical Repair & Wiring', 'zap', 'Short circuits, fan installation, wiring, and switchboards', 199.00),
('cat_ac_service', 'AC Repair & Servicing', 'wind', 'Filter cleaning, gas refill, and cooling troubleshooting', 349.00),
('cat_deep_cleaning', 'Home & Sofa Cleaning', 'sparkles', 'Full home deep cleaning, sofa, and kitchen sanitization', 499.00),
('cat_carpentry', 'Carpentry & Furniture', 'hammer', 'Door repair, furniture assembly, and wooden locks', 249.00);


-- =======================================
-- MIGRATION: 024_pending_modules_all.sqlite.sql
-- =======================================

-- Migration: 024_pending_modules_all.sqlite.sql

-- A. Medical & Health Module
CREATE TABLE IF NOT EXISTS medical_doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    consultation_fee REAL DEFAULT 500.00,
    hospital_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    experience_years INTEGER DEFAULT 5,
    rating REAL DEFAULT 4.8,
    serviced_pincodes_json TEXT DEFAULT '[]',
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_appointments (
    id TEXT PRIMARY KEY,
    appointment_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    consultation_fee REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(doctor_id) REFERENCES medical_doctors(id)
);

-- B. Local Jobs Module
CREATE TABLE IF NOT EXISTS job_postings (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    category TEXT NOT NULL,
    salary_range TEXT NOT NULL,
    location_pincode TEXT NOT NULL,
    job_type TEXT DEFAULT 'Full-time',
    description TEXT,
    contact_phone TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    experience_summary TEXT,
    status TEXT DEFAULT 'submitted',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES job_postings(id)
);

-- C. Direct Properties Module (Extending existing property_listings table if needed)
CREATE TABLE IF NOT EXISTS property_inquiries (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(property_id) REFERENCES property_listings(id)
);

-- D. Community Events Module
CREATE TABLE IF NOT EXISTS community_events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    event_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    ticket_price REAL DEFAULT 0.0,
    description TEXT,
    status TEXT DEFAULT 'upcoming',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_rsvps (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    attendee_name TEXT NOT NULL,
    attendee_phone TEXT NOT NULL,
    seats INTEGER DEFAULT 1,
    total_amount REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES community_events(id)
);

-- E. Regional Multilingual Module
CREATE TABLE IF NOT EXISTS localization_dictionaries (
    id TEXT PRIMARY KEY,
    lang_code TEXT NOT NULL, -- 'hi', 'mr', 'kn', 'ta', 'te'
    translation_key TEXT NOT NULL,
    translation_value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lang_code, translation_key)
);

-- Seed Initial Default Data
-- Medical Seed
INSERT OR IGNORE INTO medical_doctors (id, name, specialization, consultation_fee, hospital_name, phone, experience_years, serviced_pincodes_json) VALUES
('doc_1', 'Dr. Rajesh Sharma', 'General Physician', 500.00, 'Care Clinic', '9876543211', 12, '["411001", "411002"]'),
('doc_2', 'Dr. Priya Patel', 'Pediatrician', 600.00, 'Sunshine Children Clinic', '9876543212', 8, '["411001"]');

-- Jobs Seed
INSERT OR IGNORE INTO job_postings (id, title, company_name, category, salary_range, location_pincode, job_type, description, contact_phone) VALUES
('job_1', 'Retail Store Cashier', 'SuperMart Local', 'Retail', '₹15,000 - ₹18,000/mo', '411001', 'Full-time', 'Manage POS counter and inventory sorting.', '9876543213'),
('job_2', 'Delivery Executive', 'LocalSampark Express', 'Logistics', '₹18,000 - ₹25,000/mo', '411001', 'Full-time', 'Hyperlocal delivery partner for neighborhood orders.', '9876543214');

-- Properties Seed
INSERT OR IGNORE INTO property_listings (id, user_id, title, description, property_type, listing_type, price, deposit, amenities, is_verified, is_active) VALUES
('prop_1', 'user_owner_1', 'Spacious 2BHK Apartment', 'Gated community with gym and security near MG Road.', 'flat', 'rent', 22000.00, 50000.00, '["gym", "parking"]', 1, 1),
('prop_2', 'user_owner_2', 'Commercial Shop Space', 'Prime road facing retail shop in Main Market.', 'commercial', 'sale', 4500000.00, 0.00, '["main_road"]', 1, 1);

-- Events Seed
INSERT OR IGNORE INTO community_events (id, organizer_id, title, category, event_date, time_slot, venue_address, pincode, ticket_price, description) VALUES
('evt_1', 'org_1', 'Neighborhood Organic Farming Workshop', 'Workshop', '2026-08-10', '10:00 AM - 01:00 PM', 'Community Hall, Sector 4', '411001', 0.00, 'Learn urban gardening techniques.'),
('evt_2', 'org_2', 'Local Art & Craft Mela', 'Cultural', '2026-08-15', '04:00 PM - 09:00 PM', 'Town Square Ground', '411001', 50.00, 'Support local artisans and handicraft vendors.');

-- Multilingual Seed
INSERT OR IGNORE INTO localization_dictionaries (id, lang_code, translation_key, translation_value) VALUES
('loc_1', 'hi', 'welcome_headline', 'लोकल संपर्क में आपका स्वागत है'),
('loc_2', 'mr', 'welcome_headline', 'लोकल संपर्क मध्ये आपले स्वागत आहे'),
('loc_3', 'hi', 'search_placeholder', 'दुकानें, सेवाएं और जॉब्स खोजें'),
('loc_4', 'mr', 'search_placeholder', 'दुकाने, सेवा आणि नोकऱ्या शोधा');


-- =======================================
-- MIGRATION: 025_geospatial_indexing.sqlite.sql
-- =======================================

-- Migration: Add geohash column and spatial B-Tree indexes for ultra-fast location filtering

-- 1. Add geohash column if it doesn't exist
ALTER TABLE local_shops ADD COLUMN geohash TEXT;

-- 2. Create spatial indexes for bounding box and geohash acceleration
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON local_shops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_shops_geohash ON local_shops(geohash);
CREATE INDEX IF NOT EXISTS idx_shops_approval_lat_lng ON local_shops(approval_status, is_active, latitude, longitude);


-- =======================================
-- MIGRATION: 026_medical_health_schema.sqlite.sql
-- =======================================

-- Migration: Medical & Health Schema

CREATE TABLE IF NOT EXISTS medical_doctors (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    license_no TEXT UNIQUE NOT NULL,
    clinic_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    consultation_fee REAL DEFAULT 500.0,
    rating REAL DEFAULT 5.0,
    is_available INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    serviced_pincodes_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_appointments (
    id TEXT PRIMARY KEY,
    appointment_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    consultation_fee REAL NOT NULL,
    status TEXT DEFAULT 'confirmed',
    payment_status TEXT DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON medical_doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_geohash ON medical_doctors(geohash);


-- =======================================
-- MIGRATION: 027_jobs_schema.sqlite.sql
-- =======================================

-- Migration: Jobs Schema

CREATE TABLE IF NOT EXISTS local_job_postings (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    salary_range TEXT NOT NULL,
    job_type TEXT DEFAULT 'Full-Time',
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    applicant_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    experience_summary TEXT,
    status TEXT DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_category ON local_job_postings(category);
CREATE INDEX IF NOT EXISTS idx_jobs_geohash ON local_job_postings(geohash);


-- =======================================
-- MIGRATION: 028_properties_schema.sqlite.sql
-- =======================================

-- Migration: Properties & Real Estate Schema

CREATE TABLE IF NOT EXISTS local_property_listings (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    property_type TEXT NOT NULL,
    listing_type TEXT DEFAULT 'RENT',
    price REAL NOT NULL,
    deposit REAL DEFAULT 0,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    is_verified INTEGER DEFAULT 0,
    images_json TEXT,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_type ON local_property_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_geohash ON local_property_listings(geohash);


-- =======================================
-- MIGRATION: 029_home_services_schema.sqlite.sql
-- =======================================

-- Migration: Home Services Schema

CREATE TABLE IF NOT EXISTS home_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    base_inspection_fee REAL DEFAULT 199.0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_service_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    category_id TEXT NOT NULL,
    experience_years INTEGER DEFAULT 3,
    rating REAL DEFAULT 4.8,
    is_available INTEGER DEFAULT 1,
    serviced_pincodes_json TEXT DEFAULT '[]',
    geohash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_service_bookings (
    id TEXT PRIMARY KEY,
    booking_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    service_address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    problem_description TEXT,
    inspection_fee REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hs_providers_category ON home_service_providers(category_id);
CREATE INDEX IF NOT EXISTS idx_hs_bookings_user ON home_service_bookings(user_id);


-- =======================================
-- MIGRATION: 030_events_schema.sqlite.sql
-- =======================================

-- Migration: Events & Meetups Schema

CREATE TABLE IF NOT EXISTS local_events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    ticket_price REAL DEFAULT 0.0,
    total_capacity INTEGER DEFAULT 100,
    available_tickets INTEGER DEFAULT 100,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_tickets (
    id TEXT PRIMARY KEY,
    ticket_ref TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_category ON local_events(category);
CREATE INDEX IF NOT EXISTS idx_events_geohash ON local_events(geohash);


-- =======================================
-- MIGRATION: 031_community_schema.sqlite.sql
-- =======================================

-- Migration: Community Hub (Townsquare) Schema

CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'general', 'alert', 'lost_found', 'recommendation'
    content TEXT NOT NULL,
    media_url TEXT,
    pincode TEXT,
    geohash TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_geohash ON community_posts(geohash);


-- =======================================
-- MIGRATION: 032_spatial_hierarchy.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 032: Spatial 4-Tier Hierarchy
-- LocalSampark Enterprise Routing Engine
-- 
-- Hierarchy: State → District → Taluka → Territory (Pincode)
--
-- IMPORTANT: This file is SQLite. For PostgreSQL/PostGIS migration,
-- replace TEXT boundary_geojson columns with:
--   boundary geometry(Polygon, 4326)
-- and add GiST indexes:
--   CREATE INDEX USING GIST(boundary)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── STATES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_states (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,          -- ISO code e.g. 'MH' for Maharashtra
    boundary_geojson TEXT,              -- GeoJSON Polygon as TEXT
    -- PostGIS: boundary geometry(Polygon, 4326)
    -- PostGIS: CREATE INDEX idx_states_boundary_gist ON location_states USING GIST(boundary);
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DISTRICTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_districts (
    id TEXT PRIMARY KEY,
    state_id TEXT NOT NULL REFERENCES location_states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    boundary_geojson TEXT,
    -- PostGIS: boundary geometry(Polygon, 4326)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_districts_state ON location_districts(state_id);

-- ─── TALUKAS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_talukas (
    id TEXT PRIMARY KEY,
    district_id TEXT NOT NULL REFERENCES location_districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    boundary_geojson TEXT,
    -- PostGIS: boundary geometry(Polygon, 4326)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district_id, name)
);

CREATE INDEX IF NOT EXISTS idx_talukas_district ON location_talukas(district_id);

-- ─── TERRITORIES (Pincode-level, the leaf node) ─────────────────────────
CREATE TABLE IF NOT EXISTS territories (
    id TEXT PRIMARY KEY,
    taluka_id TEXT NOT NULL REFERENCES location_talukas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                  -- Area name e.g. "Viman Nagar"
    pincode TEXT NOT NULL UNIQUE,        -- 6-digit Indian postal code
    centroid_lat REAL NOT NULL,
    centroid_lng REAL NOT NULL,
    boundary_geojson TEXT,               -- GeoJSON Polygon defining exact territory bounds
    -- PostGIS: boundary geometry(Polygon, 4326)
    -- PostGIS: centroid geometry(Point, 4326)
    -- PostGIS: CREATE INDEX idx_territories_boundary_gist ON territories USING GIST(boundary);
    -- PostGIS: CREATE INDEX idx_territories_centroid_gist ON territories USING GIST(centroid);
    radius_km REAL DEFAULT 5.0,
    tier TEXT DEFAULT 'tier3',           -- tier1 (metro) / tier2 (city) / tier3 (rural)
    zone_type TEXT DEFAULT 'urban',      -- urban / suburban / rural
    is_active INTEGER DEFAULT 1,
    launch_date TEXT,
    population_estimate INTEGER,
    local_language TEXT DEFAULT 'mr',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_territories_pincode ON territories(pincode);
CREATE INDEX IF NOT EXISTS idx_territories_active ON territories(is_active);
CREATE INDEX IF NOT EXISTS idx_territories_taluka ON territories(taluka_id);
CREATE INDEX IF NOT EXISTS idx_territories_centroid ON territories(centroid_lat, centroid_lng);

-- ─── CATEGORY-TERRITORY MATRIX (Phase 5 prep) ──────────────────────────
CREATE TABLE IF NOT EXISTS category_territory_matrix (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    territory_id TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,          -- Higher = shown first
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_matrix_territory ON category_territory_matrix(territory_id);
CREATE INDEX IF NOT EXISTS idx_cat_matrix_category ON category_territory_matrix(category_id);

-- ─── LEGACY MAPPING TABLE ───────────────────────────────────────────────
-- Maps old regions.id → new territories.id for backward compatibility
CREATE TABLE IF NOT EXISTS legacy_region_territory_map (
    legacy_region_id TEXT PRIMARY KEY,
    territory_id TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE
);


-- =======================================
-- MIGRATION: 033_admin_territory_assignments.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 033: Admin Territory Assignments (RBAC Hard Partitioning)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_territory_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    territory_id TEXT REFERENCES territories(id) ON DELETE CASCADE,
    district_id TEXT REFERENCES location_districts(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'territory_franchise',
    assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_assign_user ON admin_territory_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_assign_territory ON admin_territory_assignments(territory_id);
CREATE INDEX IF NOT EXISTS idx_admin_assign_district ON admin_territory_assignments(district_id);
CREATE INDEX IF NOT EXISTS idx_admin_assign_active ON admin_territory_assignments(is_active);


-- =======================================
-- MIGRATION: 034_society_mega_upgrade.sqlite.sql
-- =======================================

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
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    leave_at_gate INTEGER DEFAULT 0,
    is_revoked INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_ivr_logs (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    phone_called TEXT NOT NULL,
    call_status TEXT,
    dtmf_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_visitor_blacklist (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    reason TEXT,
    added_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_cab_preapprovals (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    cab_service TEXT,
    estimated_arrival TIMESTAMP,
    driver_name TEXT,
    passcode TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 3 TABLES
CREATE TABLE IF NOT EXISTS society_billing_config (
    society_id TEXT PRIMARY KEY,
    construction_cost_per_sqft REAL,
    sinking_fund_rate_percent REAL,
    gst_enabled INTEGER DEFAULT 0,
    billing_day INTEGER DEFAULT 1,
    late_penalty_rate_percent REAL DEFAULT 21,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_flat_ledger (
    flat_number TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    carpet_area REAL,
    bhk_type TEXT,
    is_tenant INTEGER DEFAULT 0,
    tenant_lease_end TIMESTAMP,
    outstanding_balance REAL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_penalty_ledger (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    amount REAL NOT NULL,
    days_overdue INTEGER,
    is_reversed INTEGER DEFAULT 0,
    reverse_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_advance_account (
    flat_number TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    balance REAL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_tally_exports (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    export_type TEXT,
    xml_payload TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 4 TABLES
CREATE TABLE IF NOT EXISTS society_patrol_routes (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    name TEXT NOT NULL,
    checkpoints_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_patrol_logs (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    guard_id TEXT NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
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
    entry_time TIMESTAMP,
    exit_time TIMESTAMP,
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
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 5 TABLES
CREATE TABLE IF NOT EXISTS society_police_verification (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    expiry_date TIMESTAMP,
    verified_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    contract_start TIMESTAMP,
    contract_end TIMESTAMP,
    monthly_cost REAL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS society_vendor_invoices (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    amount REAL NOT NULL,
    gst_amount REAL DEFAULT 0,
    invoice_date TIMESTAMP,
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
    amc_expiry TIMESTAMP,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS society_asset_maintenance_log (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    service_type TEXT,
    service_date TIMESTAMP,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 8 TABLES
CREATE TABLE IF NOT EXISTS society_amenity_locks (
    id TEXT PRIMARY KEY,
    amenity_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    locked_until TIMESTAMP NOT NULL
);

-- PHASE 9 TABLES
CREATE TABLE IF NOT EXISTS society_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_forum_replies (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 10 TABLES
CREATE TABLE IF NOT EXISTS society_guard_shifts (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    guard_id TEXT NOT NULL,
    gate_id TEXT,
    shift_name TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_intercom_sessions (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    caller_id TEXT,
    receiver_id TEXT,
    status TEXT DEFAULT 'initiated',
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHASE 11 TABLES
CREATE TABLE IF NOT EXISTS society_budget (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    year TEXT NOT NULL,
    total_amount REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    meeting_date TIMESTAMP,
    venue TEXT,
    quorum_required INTEGER,
    status TEXT DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS society_agm_minutes (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    content TEXT NOT NULL,
    published_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    last_inspection TIMESTAMP,
    next_due TIMESTAMP,
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
ALTER TABLE society_visitors ADD COLUMN approval_timeout_at TIMESTAMP;
ALTER TABLE society_visitors ADD COLUMN ivr_fallback_triggered INTEGER DEFAULT 0;
ALTER TABLE society_visitors ADD COLUMN passcode_used INTEGER DEFAULT 0;

ALTER TABLE society_staff_attendance ADD COLUMN gate_id TEXT;
ALTER TABLE society_staff_attendance ADD COLUMN face_match_score REAL;
ALTER TABLE society_staff_attendance ADD COLUMN check_in_photo_url TEXT;

ALTER TABLE society_complaints ADD COLUMN sla_hours INTEGER DEFAULT 24;
ALTER TABLE society_complaints ADD COLUMN escalation_level INTEGER DEFAULT 0;
ALTER TABLE society_complaints ADD COLUMN escalated_to TEXT;
ALTER TABLE society_complaints ADD COLUMN eta TIMESTAMP;
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
ALTER TABLE society_members ADD COLUMN member_since TIMESTAMP;

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
ALTER TABLE society_move_passes ADD COLUMN admin_approved_at TIMESTAMP;
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


-- =======================================
-- MIGRATION: 035_community_notices.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS society_notices (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    posted_by TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    document_url TEXT,
    is_urgent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_notice_receipts (
    id TEXT PRIMARY KEY,
    notice_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notice_id, user_id)
);


-- =======================================
-- MIGRATION: 036_guard_shifts_ratings_intercom.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS society_ratings (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'guard', 'visitor', 'vendor'
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_intercom_logs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    caller_id TEXT NOT NULL, -- guard_id or resident_id
    receiver_id TEXT NOT NULL, -- resident_id or guard_id
    flat_number TEXT,
    call_status TEXT DEFAULT 'initiated', -- 'initiated', 'answered', 'missed'
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =======================================
-- MIGRATION: 037_phase11_agm_budget_audits.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS society_agm (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    title TEXT NOT NULL,
    meeting_date TIMESTAMP NOT NULL,
    agenda TEXT,
    location TEXT,
    meeting_link TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_agm_resolutions (
    id TEXT PRIMARY KEY,
    agm_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'proposed'
);

CREATE TABLE IF NOT EXISTS society_budgets (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    category TEXT NOT NULL,
    allocated_amount REAL NOT NULL,
    spent_amount REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_audits (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    audit_type TEXT NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    is_compliant INTEGER DEFAULT 0,
    certificate_url TEXT,
    completed_at TIMESTAMP
);


-- =======================================
-- MIGRATION: 038_vendor_kyc.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 038: Vendor KYC System
-- 10x Plan: Section 20.1.2 — Digital KYC, GST Verification, Bank Payout
-- Compatible: SQLite (dev) + PostgreSQL (prod-ready)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_kyc (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,

    -- Identity Documents
    aadhaar_number_encrypted TEXT,
    aadhaar_front_url TEXT,
    aadhaar_back_url TEXT,
    pan_number TEXT,
    pan_url TEXT,

    -- GST Verification
    gst_number TEXT,
    gst_status TEXT DEFAULT 'not_applicable',
    gst_verified_at TEXT,
    gst_type TEXT,
    gst_legal_name TEXT,
    gst_trade_name TEXT,

    -- Bank Details (for payouts)
    bank_account_number_encrypted TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    bank_branch TEXT,
    bank_verified INTEGER DEFAULT 0,
    bank_verification_ref TEXT,

    -- FSSAI (for food shops)
    fssai_number TEXT,
    fssai_expiry TEXT,
    fssai_url TEXT,

    -- Drug License (for pharmacy)
    drug_license_number TEXT,
    drug_license_url TEXT,

    -- Verification Status
    kyc_status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    verified_by TEXT REFERENCES users(id),
    verified_at TEXT,
    submitted_at TEXT,

    created_at TEXT DEFAULT (TIMESTAMP('now')),
    updated_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_shop ON vendor_kyc(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_status ON vendor_kyc(kyc_status);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_gst ON vendor_kyc(gst_number);


-- =======================================
-- MIGRATION: 039_shop_payouts.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 039: Shop Payouts & Reconciliation System
-- 10x Plan: Section 20.2.3 — Automated Payout Engine
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shop_payouts (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,

    -- Financials
    gross_gmv REAL NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    platform_commission REAL NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 10.0,
    payment_gateway_fee REAL NOT NULL DEFAULT 0,
    delivery_deductions REAL DEFAULT 0,
    gst_on_commission REAL NOT NULL DEFAULT 0,
    tds_deducted REAL DEFAULT 0,
    net_payout REAL NOT NULL DEFAULT 0,

    -- Payout Execution
    payout_status TEXT DEFAULT 'calculated',
    payout_reference TEXT,
    payout_method TEXT DEFAULT 'bank_transfer',
    payout_batch_id TEXT,
    paid_at TEXT,
    failure_reason TEXT,

    -- Audit
    calculated_by TEXT DEFAULT 'system',
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,

    created_at TEXT DEFAULT (TIMESTAMP('now')),
    updated_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_shop_payouts_shop ON shop_payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_status ON shop_payouts(payout_status);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_period ON shop_payouts(period_start, period_end);

-- Payout line items for audit trail
CREATE TABLE IF NOT EXISTS payout_line_items (
    id TEXT PRIMARY KEY,
    payout_id TEXT REFERENCES shop_payouts(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    order_amount REAL NOT NULL,
    commission_amount REAL NOT NULL,
    gateway_fee REAL NOT NULL,
    net_amount REAL NOT NULL,
    created_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout ON payout_line_items(payout_id);


-- =======================================
-- MIGRATION: 040_category_attributes.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 040: Dynamic Category Attribute System (EAV + JSONB Hybrid)
-- 10x Plan: Section 21.1 — Supports 55+ category archetypes
-- ═══════════════════════════════════════════════════════════════════════

-- Master category table with archetype mapping
CREATE TABLE IF NOT EXISTS shop_categories (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_mr TEXT,
    name_hi TEXT,
    icon TEXT,
    archetype TEXT NOT NULL DEFAULT 'retail',
    parent_category_id TEXT REFERENCES shop_categories(id),
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,

    -- Category-level configuration
    requires_fssai INTEGER DEFAULT 0,
    requires_gst INTEGER DEFAULT 0,
    requires_drug_license INTEGER DEFAULT 0,
    supports_delivery INTEGER DEFAULT 1,
    supports_pickup INTEGER DEFAULT 1,
    supports_appointment INTEGER DEFAULT 0,
    supports_subscription INTEGER DEFAULT 0,
    supports_table_booking INTEGER DEFAULT 0,
    default_commission_pct REAL DEFAULT 10.0,
    min_order_amount REAL DEFAULT 0,

    created_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_shop_categories_slug ON shop_categories(slug);
CREATE INDEX IF NOT EXISTS idx_shop_categories_archetype ON shop_categories(archetype);
CREATE INDEX IF NOT EXISTS idx_shop_categories_parent ON shop_categories(parent_category_id);

-- Dynamic attribute definitions per category
CREATE TABLE IF NOT EXISTS category_attributes (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES shop_categories(id) ON DELETE CASCADE,
    attribute_key TEXT NOT NULL,
    attribute_label TEXT NOT NULL,
    attribute_label_mr TEXT,
    attribute_label_hi TEXT,
    attribute_type TEXT NOT NULL DEFAULT 'text',
    options TEXT,
    default_value TEXT,
    is_required INTEGER DEFAULT 0,
    is_filterable INTEGER DEFAULT 0,
    is_searchable INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    validation_rules TEXT,
    help_text TEXT,

    UNIQUE(category_id, attribute_key)
);

CREATE INDEX IF NOT EXISTS idx_category_attrs_cat ON category_attributes(category_id);

-- Shop-specific attribute values (EAV)
CREATE TABLE IF NOT EXISTS shop_attribute_values (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    attribute_id TEXT REFERENCES category_attributes(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number REAL,
    value_boolean INTEGER,
    value_json TEXT,

    UNIQUE(shop_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_attrs_shop ON shop_attribute_values(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_attrs_attr ON shop_attribute_values(attribute_id);

-- ═══════════════════════════════════════════════════════════════════════
-- SEED: All 55+ categories from ARCHETYPE_MAP
-- ═══════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO shop_categories (id, slug, name, icon, archetype, requires_fssai, supports_appointment) VALUES
  ('cat-001', 'grocery-supermarkets', 'Grocery & Supermarket', '🛒', 'retail', 0, 0),
  ('cat-002', 'restaurants-cafes', 'Restaurants & Cafes', '🍽️', 'restaurant', 1, 0),
  ('cat-003', 'pharmacy-healthcare', 'Pharmacy & Healthcare', '💊', 'pharmacy', 0, 0),
  ('cat-004', 'fresh-produce-meat', 'Fresh Produce & Meat', '🥩', 'pharmacy', 1, 0),
  ('cat-005', 'dairy-sweets-bakery', 'Dairy, Sweets & Bakery', '🧁', 'retail', 1, 0),
  ('cat-006', 'stationery-gifts-books', 'Stationery, Gifts & Books', '📚', 'retail', 0, 0),
  ('cat-007', 'florists-nurseries', 'Florists & Nurseries', '🌸', 'fresh_perishable', 0, 0),
  ('cat-008', 'pet-care-supplies', 'Pet Care & Supplies', '🐾', 'retail', 0, 1),
  ('cat-009', 'pooja-samagri-religious', 'Pooja Samagri & Religious', '🕉️', 'retail', 0, 0),
  ('cat-010', 'eyewear-opticians', 'Eyewear & Opticians', '👓', 'eyewear', 0, 1),
  ('cat-011', 'home-services-plumbers', 'Plumber & Home Services', '🔧', 'home_visit', 0, 1),
  ('cat-012', 'salon-beauty-spa', 'Salon, Beauty & Spa', '💇', 'salon_wellness', 0, 1),
  ('cat-013', 'electricians-electronics', 'Electricians & Electronics', '⚡', 'garage_repair', 0, 1),
  ('cat-014', 'tutors-education', 'Tutors & Education', '📖', 'education', 0, 1),
  ('cat-015', 'hardware-sanitary', 'Hardware & Sanitary', '🔩', 'retail', 0, 0),
  ('cat-016', 'clothing-fashion', 'Clothing & Fashion', '👗', 'retail', 0, 0),
  ('cat-017', 'gym-fitness', 'Gym & Fitness', '💪', 'salon_wellness', 0, 1),
  ('cat-018', 'real-estate-brokers', 'Real Estate Brokers', '🏠', 'professional', 0, 1),
  ('cat-019', 'automotive-mechanic', 'Automotive & Mechanic', '🚗', 'garage_repair', 0, 1),
  ('cat-020', 'dentists-orthodontists', 'Dentists & Orthodontists', '🦷', 'healthcare', 0, 1),
  ('cat-021', 'pathology-labs', 'Pathology Labs', '🔬', 'healthcare', 0, 1),
  ('cat-022', 'physiotherapy', 'Physiotherapy', '🏥', 'healthcare', 0, 1),
  ('cat-023', 'ayurvedic-homeopathic', 'Ayurvedic & Homeopathic', '🌿', 'healthcare', 0, 1),
  ('cat-024', 'pest-control', 'Pest Control', '🐜', 'home_visit', 0, 1),
  ('cat-025', 'deep-cleaning', 'Deep Cleaning', '🧹', 'home_visit', 0, 1),
  ('cat-026', 'ac-appliance-repair', 'AC & Appliance Repair', '❄️', 'garage_repair', 0, 1),
  ('cat-027', 'ro-water-purifier', 'RO & Water Purifier', '💧', 'garage_repair', 0, 1),
  ('cat-028', 'laundry-dry-cleaning', 'Laundry & Dry Cleaning', '👔', 'laundry', 0, 0),
  ('cat-029', 'tailoring-boutiques', 'Tailoring & Boutiques', '🧵', 'tailoring', 0, 1),
  ('cat-030', 'car-bike-wash', 'Car & Bike Wash', '🚿', 'salon_wellness', 0, 1),
  ('cat-031', 'driving-schools', 'Driving Schools', '🚘', 'education', 0, 1),
  ('cat-032', 'catering-party', 'Catering & Party', '🎉', 'event_creative', 0, 1),
  ('cat-033', 'event-planners-decorators', 'Event Planners & Decorators', '🎊', 'event_creative', 0, 1),
  ('cat-034', 'photographers-videographers', 'Photographers & Videographers', '📸', 'event_creative', 0, 1),
  ('cat-035', 'cas-tax-consultants', 'CAs & Tax Consultants', '📊', 'professional', 0, 1),
  ('cat-036', 'lawyers-advocates', 'Lawyers & Advocates', '⚖️', 'professional', 0, 1),
  ('cat-037', 'insurance-agents', 'Insurance Agents', '🛡️', 'professional', 0, 1),
  ('cat-038', 'yoga-wellness', 'Yoga & Wellness', '🧘', 'salon_wellness', 0, 1),
  ('cat-039', 'dieticians-nutritionists', 'Dieticians & Nutritionists', '🥗', 'healthcare', 0, 1),
  ('cat-040', 'tiffin-meal-subscription', 'Tiffin & Meal Subscription', '🍱', 'tiffin', 1, 0),
  ('cat-041', 'mobile-computer-repair', 'Mobile & Computer Repair', '📱', 'garage_repair', 0, 1),
  ('cat-042', 'courier-parcel-services', 'Courier & Parcel Services', '📦', 'print_counter', 0, 0),
  ('cat-043', 'travel-agents-visa', 'Travel Agents & Visa', '✈️', 'professional', 0, 1),
  ('cat-044', 'printing-xerox-dtp', 'Printing, Xerox & DTP', '🖨️', 'print_counter', 0, 0),
  ('cat-045', 'locksmith-key-maker', 'Locksmith & Key Maker', '🔑', 'home_visit', 0, 1),
  ('cat-046', 'packers-movers', 'Packers & Movers', '📦', 'home_visit', 0, 1),
  ('cat-047', 'water-tanker-supply', 'Water Tanker Supply', '🚰', 'subscription', 0, 0),
  ('cat-048', 'gas-cylinder-lpg', 'Gas Cylinder & LPG', '🔥', 'subscription', 0, 0),
  ('cat-049', 'jewellery-gold', 'Jewellery & Gold', '💎', 'retail', 0, 0),
  ('cat-050', 'wedding-party-planner', 'Wedding & Party Planner', '💒', 'event_creative', 0, 1),
  ('cat-051', 'interior-design-decor', 'Interior Design & Decor', '🏡', 'event_creative', 0, 1),
  ('cat-052', 'painting-renovation', 'Painting & Renovation', '🎨', 'home_visit', 0, 1),
  ('cat-053', 'security-cctv', 'Security & CCTV', '📹', 'home_visit', 0, 1),
  ('cat-054', 'coaching-test-prep', 'Coaching & Test Prep', '🎓', 'education', 0, 1),
  ('cat-055', 'astrologer-pandit', 'Astrologer & Pandit', '⭐', 'event_creative', 0, 1),
  ('cat-056', 'turf-grounds', 'Turf & Grounds', '⚽', 'event_creative', 0, 1);

-- ═══════════════════════════════════════════════════════════════════════
-- SEED: Category-specific attributes
-- ═══════════════════════════════════════════════════════════════════════

-- Restaurant attributes
INSERT OR IGNORE INTO category_attributes (id, category_id, attribute_key, attribute_label, attribute_type, options, is_filterable, is_searchable) VALUES
  ('attr-r01', 'cat-002', 'cuisine_type', 'Cuisine Type', 'multiselect', '["North Indian","South Indian","Chinese","Italian","Mughlai","Street Food","Continental","Maharashtrian","Punjabi","Bengali","Gujarati","Rajasthani"]', 1, 1),
  ('attr-r02', 'cat-002', 'veg_nonveg', 'Food Type', 'select', '["Pure Veg","Non-Veg","Both","Vegan","Jain"]', 1, 1),
  ('attr-r03', 'cat-002', 'meal_type', 'Meal Types', 'multiselect', '["Breakfast","Lunch","Dinner","Snacks","All Day"]', 1, 0),
  ('attr-r04', 'cat-002', 'avg_prep_time', 'Avg Preparation Time (mins)', 'number', NULL, 0, 0),
  ('attr-r05', 'cat-002', 'seating_capacity', 'Seating Capacity', 'number', NULL, 0, 0),
  ('attr-r06', 'cat-002', 'has_ac', 'AC Available', 'boolean', NULL, 1, 0),
  ('attr-r07', 'cat-002', 'accepts_online_order', 'Accepts Online Orders', 'boolean', NULL, 1, 0);

-- Electrician attributes
INSERT OR IGNORE INTO category_attributes (id, category_id, attribute_key, attribute_label, attribute_type, options, is_filterable, is_searchable) VALUES
  ('attr-e01', 'cat-013', 'hourly_rate', 'Hourly Rate (₹)', 'number', NULL, 1, 0),
  ('attr-e02', 'cat-013', 'service_types', 'Service Types', 'multiselect', '["Wiring","Fuse Box","Fan/AC Installation","Appliance Repair","Smart Home","Industrial","Solar Panel"]', 1, 1),
  ('attr-e03', 'cat-013', 'emergency_available', '24/7 Emergency Available', 'boolean', NULL, 1, 0),
  ('attr-e04', 'cat-013', 'certifications', 'Certifications', 'multiselect', '["Licensed Electrician","NSDC Certified","ITI Diploma","Wire Man License"]', 0, 0),
  ('attr-e05', 'cat-013', 'service_radius_km', 'Service Radius (km)', 'number', NULL, 0, 0);

-- Real Estate attributes
INSERT OR IGNORE INTO category_attributes (id, category_id, attribute_key, attribute_label, attribute_type, options, is_filterable, is_searchable) VALUES
  ('attr-re01', 'cat-018', 'property_types', 'Property Types', 'multiselect', '["1 BHK","2 BHK","3 BHK","4+ BHK","Studio","Penthouse","Villa","Plot","Commercial","PG","Warehouse"]', 1, 1),
  ('attr-re02', 'cat-018', 'price_range', 'Price Range', 'text', NULL, 1, 0),
  ('attr-re03', 'cat-018', 'amenities', 'Amenities', 'multiselect', '["Parking","Gym","Swimming Pool","Garden","Security","Power Backup","Lift","Club House","Children Play Area"]', 1, 0),
  ('attr-re04', 'cat-018', 'rera_registered', 'RERA Registered', 'boolean', NULL, 1, 0);

-- Healthcare/Pathology attributes
INSERT OR IGNORE INTO category_attributes (id, category_id, attribute_key, attribute_label, attribute_type, options, is_filterable, is_searchable) VALUES
  ('attr-h01', 'cat-021', 'home_collection', 'Home Sample Collection', 'boolean', NULL, 1, 0),
  ('attr-h02', 'cat-021', 'report_delivery_hrs', 'Report Delivery Time (hours)', 'number', NULL, 1, 0),
  ('attr-h03', 'cat-021', 'nabl_accredited', 'NABL Accredited', 'boolean', NULL, 1, 0),
  ('attr-h04', 'cat-021', 'test_count', 'Number of Tests Available', 'number', NULL, 0, 0);

-- Gym/Fitness attributes
INSERT OR IGNORE INTO category_attributes (id, category_id, attribute_key, attribute_label, attribute_type, options, is_filterable, is_searchable) VALUES
  ('attr-g01', 'cat-017', 'membership_plans', 'Membership Plans', 'multiselect', '["Monthly","Quarterly","Half-Yearly","Annual","Per Session"]', 1, 0),
  ('attr-g02', 'cat-017', 'facilities', 'Facilities', 'multiselect', '["Cardio","Weight Training","Crossfit","Yoga","Zumba","Steam/Sauna","Personal Trainer","Parking"]', 1, 1),
  ('attr-g03', 'cat-017', 'trial_available', 'Free Trial Available', 'boolean', NULL, 1, 0),
  ('attr-g04', 'cat-017', 'monthly_price', 'Monthly Fee (₹)', 'number', NULL, 1, 0);

-- Tiffin/Meal Subscription attributes
INSERT OR IGNORE INTO category_attributes (id, category_id, attribute_key, attribute_label, attribute_type, options, is_filterable, is_searchable) VALUES
  ('attr-t01', 'cat-040', 'meal_plans', 'Meal Plans', 'multiselect', '["Daily","Weekly","Monthly","Lunch Only","Dinner Only","Both"]', 1, 0),
  ('attr-t02', 'cat-040', 'cuisine', 'Cuisine', 'multiselect', '["Maharashtrian","North Indian","South Indian","Gujarati","Jain","Vegan"]', 1, 1),
  ('attr-t03', 'cat-040', 'price_per_meal', 'Price Per Meal (₹)', 'number', NULL, 1, 0),
  ('attr-t04', 'cat-040', 'delivery_time', 'Delivery Schedule', 'text', NULL, 0, 0);


-- =======================================
-- MIGRATION: 041_fraud_prevention.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 041: Fraud Prevention System
-- 10x Plan: Section 22.3 — 3-Layer Fraud Detection Engine
-- ═══════════════════════════════════════════════════════════════════════

-- Fraud detection signals
CREATE TABLE IF NOT EXISTS fraud_signals (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'low',
    details TEXT NOT NULL DEFAULT '{}',
    fraud_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    auto_action_taken TEXT,
    reviewed_by TEXT REFERENCES users(id),
    reviewed_at TEXT,
    review_notes TEXT,
    created_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_fraud_entity ON fraud_signals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_signals(status);
CREATE INDEX IF NOT EXISTS idx_fraud_severity ON fraud_signals(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_type ON fraud_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_fraud_created ON fraud_signals(created_at);

-- Device fingerprinting for multi-account detection
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_model TEXT,
    os_name TEXT,
    os_version TEXT,
    app_version TEXT,
    ip_address TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    language TEXT,
    first_seen_at TEXT DEFAULT (TIMESTAMP('now')),
    last_seen_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_device_fp_device ON device_fingerprints(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fp_user ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fp_ip ON device_fingerprints(ip_address);

-- IP reputation tracking
CREATE TABLE IF NOT EXISTS ip_reputation (
    id TEXT PRIMARY KEY,
    ip_address TEXT UNIQUE NOT NULL,
    risk_score INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    associated_users INTEGER DEFAULT 0,
    is_proxy INTEGER DEFAULT 0,
    is_vpn INTEGER DEFAULT 0,
    country_code TEXT,
    city TEXT,
    last_seen_at TEXT DEFAULT (TIMESTAMP('now')),
    created_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_rep_address ON ip_reputation(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_rep_score ON ip_reputation(risk_score);

-- Blocked entities
CREATE TABLE IF NOT EXISTS fraud_blocklist (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    blocked_by TEXT REFERENCES users(id),
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (TIMESTAMP('now')),
    UNIQUE(entity_type, entity_value)
);

CREATE INDEX IF NOT EXISTS idx_blocklist_type ON fraud_blocklist(entity_type, entity_value);


-- =======================================
-- MIGRATION: 042_dpdp_compliance.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 042: DPDP Act Compliance — Consent & Data Rights
-- 10x Plan: Section 22.2 — India's Digital Personal Data Protection
-- ═══════════════════════════════════════════════════════════════════════

-- User consent records
CREATE TABLE IF NOT EXISTS user_consents (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    consent_purpose TEXT NOT NULL,
    granted INTEGER NOT NULL DEFAULT 0,
    granted_at TEXT,
    revoked_at TEXT,
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (TIMESTAMP('now')),
    updated_at TEXT DEFAULT (TIMESTAMP('now')),
    UNIQUE(user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON user_consents(consent_type);

-- Data subject requests (right to erasure, right to access)
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    requested_data TEXT,
    export_file_url TEXT,
    processed_by TEXT REFERENCES users(id),
    processed_at TEXT,
    completed_at TEXT,
    rejection_reason TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (TIMESTAMP('now')),
    updated_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_dsr_user ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(request_type);

-- Data breach log (CERT-In notification requirement)
CREATE TABLE IF NOT EXISTS data_breach_log (
    id TEXT PRIMARY KEY,
    breach_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_users_count INTEGER DEFAULT 0,
    data_types_affected TEXT,
    discovery_timestamp TEXT NOT NULL,
    containment_timestamp TEXT,
    notification_timestamp TEXT,
    certin_reference TEXT,
    remediation_steps TEXT,
    reported_by TEXT REFERENCES users(id),
    status TEXT DEFAULT 'detected',
    created_at TEXT DEFAULT (TIMESTAMP('now'))
);

-- Privacy policy versions
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id TEXT PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    content_url TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    summary_of_changes TEXT,
    requires_reconsent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (TIMESTAMP('now'))
);


-- =======================================
-- MIGRATION: 043_offline_sync_analytics.sqlite.sql
-- =======================================

-- ═══════════════════════════════════════════════════════════════════════
-- Migration 043: Offline Sync Tracking & Shop Analytics Cache
-- 10x Plan: Section 22.1 — Offline-First for Tier-3/4 India
-- ═══════════════════════════════════════════════════════════════════════

-- Sync watermarks per device
CREATE TABLE IF NOT EXISTS sync_watermarks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    territory_id TEXT,
    last_synced_at TEXT NOT NULL,
    records_synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (TIMESTAMP('now')),
    updated_at TEXT DEFAULT (TIMESTAMP('now')),
    UNIQUE(user_id, device_id, table_name, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_user_device ON sync_watermarks(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_territory ON sync_watermarks(territory_id);

-- Offline mutation queue (server-side record of pending mutations from devices)
CREATE TABLE IF NOT EXISTS offline_mutations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    mutation_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    conflict_resolution TEXT,
    applied_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (TIMESTAMP('now'))
);

CREATE INDEX IF NOT EXISTS idx_offline_mut_user ON offline_mutations(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_offline_mut_status ON offline_mutations(status);

-- Shop analytics daily snapshots (pre-computed for dashboard performance)
CREATE TABLE IF NOT EXISTS shop_analytics_daily (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,
    
    -- Revenue
    gross_revenue REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0,
    delivery_revenue REAL DEFAULT 0,
    
    -- Customer metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    repeat_customers INTEGER DEFAULT 0,
    
    -- Engagement
    profile_views INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    click_through_rate REAL DEFAULT 0,
    
    -- Reviews
    reviews_received INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    
    -- Appointments (for service shops)
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (TIMESTAMP('now')),
    UNIQUE(shop_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shop_analytics_shop ON shop_analytics_daily(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_analytics_date ON shop_analytics_daily(date);

-- Zone-level analytics cache
CREATE TABLE IF NOT EXISTS zone_analytics_daily (
    id TEXT PRIMARY KEY,
    territory_id TEXT NOT NULL,
    date TEXT NOT NULL,
    
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_shops INTEGER DEFAULT 0,
    active_shops INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_gmv REAL DEFAULT 0,
    top_categories TEXT,
    
    created_at TEXT DEFAULT (TIMESTAMP('now')),
    UNIQUE(territory_id, date)
);

CREATE INDEX IF NOT EXISTS idx_zone_analytics_territory ON zone_analytics_daily(territory_id);
CREATE INDEX IF NOT EXISTS idx_zone_analytics_date ON zone_analytics_daily(date);


-- =======================================
-- MIGRATION: 044_missing_tables.sqlite.sql
-- =======================================

-- 044_missing_tables.sqlite.sql
-- Fix missing tables for admin dashboard and multilingual features

CREATE TABLE IF NOT EXISTS local_job_postings (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    title TEXT,
    description TEXT,
    salary REAL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_providers (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    address TEXT,
    contact_number TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_subscriptions (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    plan_name TEXT,
    status TEXT DEFAULT 'active',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_emergency_alerts (
    id TEXT PRIMARY KEY,
    triggered_by TEXT,
    society_id TEXT,
    alert_type TEXT,
    status TEXT DEFAULT 'active',
    resolved_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS utility_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    utility_type TEXT,
    biller_name TEXT,
    amount REAL,
    status TEXT DEFAULT 'completed',
    transaction_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT,
    phase INTEGER,
    is_enabled BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS localization_dictionaries (
    id TEXT PRIMARY KEY,
    lang_code TEXT,
    translation_key TEXT,
    translation_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed basic dictionaries for hindi to prevent 500 error
INSERT OR IGNORE INTO localization_dictionaries (id, lang_code, translation_key, translation_value) VALUES 
('dict_hi_1', 'hi', 'greeting', 'नमस्ते'),
('dict_hi_2', 'hi', 'search_placeholder', 'दुकानें और सेवाएँ खोजें...'),
('dict_hi_3', 'hi', 'home', 'होम');


-- =======================================
-- MIGRATION: 045_universal_ecommerce_catalog.sqlite.sql
-- =======================================

-- 045_universal_ecommerce_catalog.sqlite.sql

-- Universal Catalog Items for Polymorphic Ecommerce
CREATE TABLE IF NOT EXISTS universal_catalog_items (
    id SERIAL PRIMARY KEY,
    shop_id UUID NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'physical_good', -- physical_good, service, subscription, job_card
    title TEXT NOT NULL,
    description TEXT,
    pricing_model TEXT NOT NULL DEFAULT 'fixed', -- fixed, hourly, variable
    price REAL NOT NULL,
    compare_at_price REAL,
    inventory_count INTEGER DEFAULT 0,
    availability_matrix TEXT, -- JSON string for service slots
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES local_shops(id) ON DELETE CASCADE
);

-- Universal Orders to unify all 66 categories
CREATE TABLE IF NOT EXISTS universal_orders (
    id SERIAL PRIMARY KEY,
    shop_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount REAL NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'retail', -- retail, booking, job_card
    scheduled_time TIMESTAMP, -- for bookings
    delivery_address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES local_shops(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Universal Order Items
CREATE TABLE IF NOT EXISTS universal_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time REAL NOT NULL,
    meta_data TEXT, -- JSON for custom variations/slots selected
    FOREIGN KEY (order_id) REFERENCES universal_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES universal_catalog_items(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_univ_catalog_shop ON universal_catalog_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_univ_orders_shop ON universal_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_univ_orders_user ON universal_orders(user_id);


-- =======================================
-- MIGRATION: 046_add_metadata.sqlite.sql
-- =======================================

-- 046_add_metadata.sqlite.sql

ALTER TABLE universal_catalog_items ADD COLUMN metadata TEXT; -- JSON for dynamic category schemas


-- =======================================
-- MIGRATION: 047_universal_leads.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS universal_leads (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    lead_type VARCHAR(50) NOT NULL, -- 'FAVORITE', 'ABANDONED_CART', 'INQUIRY'
    lead_status VARCHAR(50) DEFAULT 'NEW', -- 'NEW', 'CONTACTED', 'CONVERTED'
    content TEXT, -- JSON or string context about the lead
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES Shop(id),
    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE INDEX idx_universal_leads_shop ON universal_leads(shop_id);
CREATE INDEX idx_universal_leads_user ON universal_leads(user_id);


-- =======================================
-- MIGRATION: 048_phase5_staff_reviews_analytics.sqlite.sql
-- =======================================

-- Migration 048: Phase 5 Staff, Reviews, and Analytics
-- Creates tables for Shop Staff, Reviews, and pre-calculated Analytics snapshots.

-- Staff Table (Administrative use by Shop Owner)
CREATE TABLE IF NOT EXISTS shop_staff (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active',
  shift TEXT,
  commission REAL DEFAULT 0.0,
  joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS shop_reviews (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  user_id INTEGER,
  customer_name TEXT,
  rating INTEGER NOT NULL,
  comment TEXT,
  reply TEXT,
  status TEXT DEFAULT 'Published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Snapshots Table
CREATE TABLE IF NOT EXISTS shop_analytics_snapshots (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  total_revenue REAL DEFAULT 0.0,
  total_orders INTEGER DEFAULT 0,
  total_visitors INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0.0,
  popular_items_json TEXT, -- JSON array of popular items
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, snapshot_date)
);


-- =======================================
-- MIGRATION: 049_fts5_search.sqlite.sql
-- =======================================

-- Migration 049: Global Search FTS5
-- Creates a Full-Text Search virtual table for hyper-fast directory searches.

-- 1. Create FTS5 Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS shop_search_index USING fts5(
  shop_id UNINDEXED,
  shop_name,
  shop_description,
  category,
  tags,
  tokenize='porter'
);

-- 2. Populate FTS5 table with existing shops
INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
SELECT id, name, description, category, tags FROM local_shops;

-- 3. Triggers to keep FTS index updated when a shop is created, updated, or deleted.

CREATE TRIGGER IF NOT EXISTS after_shop_insert
AFTER INSERT ON local_shops
BEGIN
  INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
  VALUES (new.id, new.name, new.description, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS after_shop_update
AFTER UPDATE ON local_shops
BEGIN
  DELETE FROM shop_search_index WHERE shop_id = old.id;
  INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
  VALUES (new.id, new.name, new.description, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS after_shop_delete
AFTER DELETE ON local_shops
BEGIN
  DELETE FROM shop_search_index WHERE shop_id = old.id;
END;


-- =======================================
-- MIGRATION: 050_delivery_riders.sqlite.sql
-- =======================================

-- Migration 050: Delivery Fleet & Live Tracking
-- Adds tables for Riders and their geospatial live tracking

CREATE TABLE IF NOT EXISTS delivery_riders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    vehicle_type TEXT DEFAULT 'bike',
    vehicle_number TEXT,
    status TEXT DEFAULT 'offline', -- 'offline', 'available', 'on_delivery'
    current_order_id TEXT,
    shop_id TEXT, -- Optional, if assigned exclusively to one shop
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_tracking (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL,
    order_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES delivery_riders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracking_rider ON live_tracking(rider_id);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON live_tracking(order_id);

-- Alter universal_orders to track assigned rider
ALTER TABLE universal_orders ADD COLUMN rider_id TEXT REFERENCES delivery_riders(id);


-- =======================================
-- MIGRATION: 051_promoted_shops.sqlite.sql
-- =======================================

-- Migration 051: Ads Engine & Promoted Shops
-- Adds promoted status to local shops for the global search algorithm

ALTER TABLE local_shops ADD COLUMN is_promoted BOOLEAN DEFAULT 0;

-- Trigger to re-sync FTS5 if a shop's promoted status changes
-- Note: the FTS index doesn't have is_promoted, but we can rely on standard SQL fallback for sorting or just keep it simple.

-- Seed some mock promoted shops
UPDATE local_shops SET is_promoted = 1 WHERE id IN (SELECT id FROM local_shops LIMIT 2);


-- =======================================
-- MIGRATION: 052_add_zones_and_users_phone.sqlite.sql
-- =======================================

-- 052_add_zones_and_users_phone.sqlite.sql
-- Fix missing zones table and phone column in users table

CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    level TEXT,
    polygon_data TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add phone column to users table if it does not exist
-- SQLite ALTER TABLE ADD COLUMN does not support IF NOT EXISTS natively in older versions, 
-- but in newer it might. Assuming simple add.
ALTER TABLE users ADD COLUMN phone TEXT;


-- =======================================
-- MIGRATION: 053_godmode_broadcasts.sqlite.sql
-- =======================================

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- e.g., 'all_users', 'all_shops', 'region_uuid'
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- ─── DYNAMIC PERFORMANCE INDEXES ────────────────────────────
-- Auto-generated by Phase 12 Database Performance Audit

-- Foreign Key B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_users_region_id ON users(region_id);
CREATE INDEX IF NOT EXISTS idx_admin_config_region_id ON admin_config(region_id);
CREATE INDEX IF NOT EXISTS idx_admin_config_updated_by ON admin_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_societies_region_id ON societies(region_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_region_id ON posts(region_id);
CREATE INDEX IF NOT EXISTS idx_posts_society_id ON posts(society_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_votes_post_id ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_local_shops_owner_id ON local_shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_local_shops_region_id ON local_shops(region_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_id ON shop_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_shop_id ON shop_reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_user_id ON shop_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_job_vacancies_shop_id ON job_vacancies(shop_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_user_id ON property_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_region_id ON property_listings(region_id);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_user_id ON delivery_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_agent_id ON deliveries(agent_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_polls_user_id ON polls(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_region_id ON polls(region_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_society_id ON society_visitors(society_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_resident_id ON society_visitors(resident_id);
CREATE INDEX IF NOT EXISTS idx_society_maintenance_society_id ON society_maintenance(society_id);
CREATE INDEX IF NOT EXISTS idx_society_maintenance_user_id ON society_maintenance(user_id);
CREATE INDEX IF NOT EXISTS idx_society_complaints_society_id ON society_complaints(society_id);
CREATE INDEX IF NOT EXISTS idx_society_complaints_user_id ON society_complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_society_complaints_resolved_by ON society_complaints(resolved_by);
CREATE INDEX IF NOT EXISTS idx_society_bookings_society_id ON society_bookings(society_id);
CREATE INDEX IF NOT EXISTS idx_society_bookings_user_id ON society_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver_id ON carpool_rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bookings_ride_id ON carpool_bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bookings_passenger_id ON carpool_bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_pet_id ON pet_alerts(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_user_id ON pet_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_shop_id ON events(shop_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_user_id ON event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_shop_id ON subscription_plans(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_shared_with ON user_documents(shared_with);
CREATE INDEX IF NOT EXISTS idx_sampark_points_user_id ON sampark_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user_id ON loyalty_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_franchise_partners_user_id ON franchise_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_franchise_partner_id ON revenue_transactions(franchise_partner_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_region_id ON revenue_transactions(region_id);
CREATE INDEX IF NOT EXISTS idx_franchise_payouts_franchise_partner_id ON franchise_payouts(franchise_partner_id);
CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON user_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser_id ON ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_shop_id ON ad_campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_appointments_shop_id ON shop_appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_appointments_staff_id ON shop_appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_shop_appointments_user_id ON shop_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shop_id ON shop_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_offers_shop_id ON shop_offers(shop_id);
CREATE INDEX IF NOT EXISTS idx_society_members_society_id ON society_members(society_id);
CREATE INDEX IF NOT EXISTS idx_society_members_user_id ON society_members(user_id);
CREATE INDEX IF NOT EXISTS idx_society_members_added_by ON society_members(added_by);
CREATE INDEX IF NOT EXISTS idx_society_settings_society_id ON society_settings(society_id);
CREATE INDEX IF NOT EXISTS idx_society_notices_society_id ON society_notices(society_id);
CREATE INDEX IF NOT EXISTS idx_society_notices_posted_by ON society_notices(posted_by);
CREATE INDEX IF NOT EXISTS idx_society_visitors_society_id ON society_visitors(society_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_resident_id ON society_visitors(resident_id);
CREATE INDEX IF NOT EXISTS idx_society_visitors_guard_id ON society_visitors(guard_id);
CREATE INDEX IF NOT EXISTS idx_society_visitor_log_visitor_id ON society_visitor_log(visitor_id);
CREATE INDEX IF NOT EXISTS idx_society_visitor_log_performed_by ON society_visitor_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_society_guard_messages_society_id ON society_guard_messages(society_id);
CREATE INDEX IF NOT EXISTS idx_society_guard_messages_sender_id ON society_guard_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_society_guard_messages_guard_id ON society_guard_messages(guard_id);
CREATE INDEX IF NOT EXISTS idx_society_guard_reminders_society_id ON society_guard_reminders(society_id);
CREATE INDEX IF NOT EXISTS idx_society_guard_reminders_guard_id ON society_guard_reminders(guard_id);
CREATE INDEX IF NOT EXISTS idx_society_guard_reminders_created_by ON society_guard_reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_society_domestic_staff_society_id ON society_domestic_staff(society_id);
CREATE INDEX IF NOT EXISTS idx_society_domestic_staff_added_by ON society_domestic_staff(added_by);
CREATE INDEX IF NOT EXISTS idx_society_staff_attendance_staff_id ON society_staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_society_staff_attendance_society_id ON society_staff_attendance(society_id);
CREATE INDEX IF NOT EXISTS idx_society_staff_attendance_marked_by ON society_staff_attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_society_maintenance_bills_society_id ON society_maintenance_bills(society_id);
CREATE INDEX IF NOT EXISTS idx_society_maintenance_bills_member_id ON society_maintenance_bills(member_id);
CREATE INDEX IF NOT EXISTS idx_society_maintenance_bills_generated_by ON society_maintenance_bills(generated_by);
CREATE INDEX IF NOT EXISTS idx_society_parking_slots_society_id ON society_parking_slots(society_id);
CREATE INDEX IF NOT EXISTS idx_society_parking_slots_assigned_to ON society_parking_slots(assigned_to);
CREATE INDEX IF NOT EXISTS idx_society_amenities_society_id ON society_amenities(society_id);
CREATE INDEX IF NOT EXISTS idx_society_amenity_bookings_amenity_id ON society_amenity_bookings(amenity_id);
CREATE INDEX IF NOT EXISTS idx_society_amenity_bookings_society_id ON society_amenity_bookings(society_id);
CREATE INDEX IF NOT EXISTS idx_society_amenity_bookings_booked_by ON society_amenity_bookings(booked_by);
CREATE INDEX IF NOT EXISTS idx_society_complaints_society_id ON society_complaints(society_id);
CREATE INDEX IF NOT EXISTS idx_society_complaints_filed_by ON society_complaints(filed_by);
CREATE INDEX IF NOT EXISTS idx_society_packages_society_id ON society_packages(society_id);
CREATE INDEX IF NOT EXISTS idx_society_packages_resident_id ON society_packages(resident_id);
CREATE INDEX IF NOT EXISTS idx_society_packages_logged_by ON society_packages(logged_by);
CREATE INDEX IF NOT EXISTS idx_society_polls_society_id ON society_polls(society_id);
CREATE INDEX IF NOT EXISTS idx_society_polls_created_by ON society_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_society_poll_votes_poll_id ON society_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_society_poll_votes_voter_id ON society_poll_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_society_emergency_alerts_society_id ON society_emergency_alerts(society_id);
CREATE INDEX IF NOT EXISTS idx_society_emergency_alerts_triggered_by ON society_emergency_alerts(triggered_by);
CREATE INDEX IF NOT EXISTS idx_society_emergency_alerts_resolved_by ON society_emergency_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_society_events_society_id ON society_events(society_id);
CREATE INDEX IF NOT EXISTS idx_society_events_created_by ON society_events(created_by);
CREATE INDEX IF NOT EXISTS idx_society_event_rsvps_event_id ON society_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_society_event_rsvps_user_id ON society_event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_commissions_shop_id ON shop_commissions(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_invoices_shop_id ON shop_invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_invoices_user_id ON shop_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_qr_codes_shop_id ON shop_qr_codes(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_id ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_off_days_staff_id ON staff_off_days(staff_id);
CREATE INDEX IF NOT EXISTS idx_surge_pricing_rules_shop_id ON surge_pricing_rules(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_zones_user_id ON user_saved_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_zones_region_id ON user_saved_zones(region_id);
CREATE INDEX IF NOT EXISTS idx_batch_orders_user_id ON batch_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_orders_delivery_partner_id ON batch_orders(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user_id ON loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_qa_shop_id ON shop_qa(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_qa_user_id ON shop_qa(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_qa_answered_by ON shop_qa(answered_by);
CREATE INDEX IF NOT EXISTS idx_flash_sales_shop_id ON flash_sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_flash_sales_product_id ON flash_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_wallets_agent_id ON delivery_wallets(agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_wallet_transactions_wallet_id ON delivery_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_agent_id ON delivery_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_FOREIGN ON delivery_batches(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_assigned_agent_id ON delivery_jobs(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_telemetry_FOREIGN ON delivery_telemetry(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_referrals_FOREIGN ON referrals(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_referrals_FOREIGN ON referrals(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_reward_coins_ledger_FOREIGN ON reward_coins_ledger(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_reviews_FOREIGN ON reviews(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_members_FOREIGN ON society_members(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_FOREIGN ON visitor_logs(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_maintenance_bills_FOREIGN ON maintenance_bills(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_notices_FOREIGN ON society_notices(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_helpdesk_FOREIGN ON society_helpdesk(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_amenities_FOREIGN ON society_amenities(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_FOREIGN ON amenity_bookings(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_polls_FOREIGN ON society_polls(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_classifieds_FOREIGN ON society_classifieds(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_daily_staff_FOREIGN ON daily_staff(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_daily_staff_flats_FOREIGN ON daily_staff_flats(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_vehicles_FOREIGN ON vehicles(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_parcel_desk_FOREIGN ON parcel_desk(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_child_security_FOREIGN ON child_security(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_pet_registry_FOREIGN ON pet_registry(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_move_passes_FOREIGN ON move_passes(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_vault_FOREIGN ON society_vault(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_expenses_FOREIGN ON society_expenses(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_blood_donors_FOREIGN ON blood_donors(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_utility_meters_FOREIGN ON utility_meters(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_meter_recharges_FOREIGN ON meter_recharges(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_intercom_logs_FOREIGN ON intercom_logs(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_group_buy_campaigns_FOREIGN ON group_buy_campaigns(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_group_buy_orders_FOREIGN ON group_buy_orders(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_carpools_FOREIGN ON society_carpools(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_resident_directory_FOREIGN ON resident_directory(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_lost_and_found_FOREIGN ON lost_and_found(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_ev_charging_stations_FOREIGN ON ev_charging_stations(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_ev_charging_sessions_FOREIGN ON ev_charging_sessions(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_water_meters_FOREIGN ON water_meters(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_society_karma_ledger_FOREIGN ON society_karma_ledger(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_cpr_responders_FOREIGN ON cpr_responders(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_ai_cctv_alerts_FOREIGN ON ai_cctv_alerts(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_faceid_profiles_FOREIGN ON faceid_profiles(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_iot_waste_bins_FOREIGN ON iot_waste_bins(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_FOREIGN ON housekeeping_tasks(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_drone_pad_deliveries_FOREIGN ON drone_pad_deliveries(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_FOREIGN ON delivery_agents(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_order_dispatch_FOREIGN ON order_dispatch(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_FOREIGN ON agent_payouts(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_shop_disputes_shop_id ON shop_disputes(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_disputes_initiator_id ON shop_disputes(initiator_id);
CREATE INDEX IF NOT EXISTS idx_shop_disputes_resolved_by ON shop_disputes(resolved_by);
CREATE INDEX IF NOT EXISTS idx_shop_returns_shop_id ON shop_returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_returns_user_id ON shop_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_returns_pickup_agent_id ON shop_returns(pickup_agent_id);
CREATE INDEX IF NOT EXISTS idx_shop_returns_approved_by ON shop_returns(approved_by);
CREATE INDEX IF NOT EXISTS idx_shop_notifications_recipient_id ON shop_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_shop_id ON shop_chat_messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_sender_id ON shop_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_receiver_id ON shop_chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shop_walkin_scans_shop_id ON shop_walkin_scans(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_walkin_scans_visitor_id ON shop_walkin_scans(visitor_id);
CREATE INDEX IF NOT EXISTS idx_shop_owner_payouts_shop_id ON shop_owner_payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_owner_payouts_settled_by ON shop_owner_payouts(settled_by);
CREATE INDEX IF NOT EXISTS idx_tiffin_plans_shop_id ON tiffin_plans(shop_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_subscriptions_plan_id ON tiffin_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_subscriptions_shop_id ON tiffin_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_subscriptions_user_id ON tiffin_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_daily_menu_shop_id ON tiffin_daily_menu(shop_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_daily_menu_plan_id ON tiffin_daily_menu(plan_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_deliveries_subscription_id ON tiffin_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_deliveries_shop_id ON tiffin_deliveries(shop_id);
CREATE INDEX IF NOT EXISTS idx_tiffin_deliveries_delivery_agent_id ON tiffin_deliveries(delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_shop_id ON restaurant_tables(shop_id);
CREATE INDEX IF NOT EXISTS idx_kds_tickets_shop_id ON kds_tickets(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_customizations_product_id ON menu_customizations(product_id);
CREATE INDEX IF NOT EXISTS idx_table_reservations_shop_id ON table_reservations(shop_id);
CREATE INDEX IF NOT EXISTS idx_table_reservations_user_id ON table_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_table_reservations_table_id ON table_reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_order_item_customizations_product_id ON order_item_customizations(product_id);
CREATE INDEX IF NOT EXISTS idx_order_item_customizations_customization_id ON order_item_customizations(customization_id);
CREATE INDEX IF NOT EXISTS idx_daily_specials_shop_id ON daily_specials(shop_id);
CREATE INDEX IF NOT EXISTS idx_daily_specials_product_id ON daily_specials(product_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_shop_id ON job_cards(shop_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_customer_id ON job_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_quotations_shop_id ON service_quotations(shop_id);
CREATE INDEX IF NOT EXISTS idx_service_quotations_customer_id ON service_quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_favorites_user_id ON shop_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_favorites_shop_id ON shop_favorites(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_wishlists_user_id ON shop_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_wishlists_product_id ON shop_wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_wishlists_shop_id ON shop_wishlists(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_locality_challenges_region_id ON locality_challenges(region_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user_id ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge_id ON user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploader_id ON file_uploads(uploader_id);
CREATE INDEX IF NOT EXISTS idx_scrap_pickups_FOREIGN ON scrap_pickups(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_cart_items_FOREIGN ON cart_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_cart_items_FOREIGN ON cart_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_orders_FOREIGN ON orders(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_orders_FOREIGN ON orders(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_order_items_FOREIGN ON order_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_order_items_FOREIGN ON order_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_order_tracking_FOREIGN ON order_tracking(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_product_variants_FOREIGN ON product_variants(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_user_addresses_FOREIGN ON user_addresses(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_shop_id ON vendor_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_plan_id ON vendor_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_home_service_providers_FOREIGN ON home_service_providers(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_home_service_bookings_FOREIGN ON home_service_bookings(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_home_service_bookings_FOREIGN ON home_service_bookings(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_medical_appointments_FOREIGN ON medical_appointments(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_job_applications_FOREIGN ON job_applications(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_FOREIGN ON property_inquiries(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_FOREIGN ON event_rsvps(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_location_districts_state_id ON location_districts(state_id);
CREATE INDEX IF NOT EXISTS idx_location_talukas_district_id ON location_talukas(district_id);
CREATE INDEX IF NOT EXISTS idx_territories_taluka_id ON territories(taluka_id);
CREATE INDEX IF NOT EXISTS idx_category_territory_matrix_territory_id ON category_territory_matrix(territory_id);
CREATE INDEX IF NOT EXISTS idx_legacy_region_territory_map_territory_id ON legacy_region_territory_map(territory_id);
CREATE INDEX IF NOT EXISTS idx_admin_territory_assignments_user_id ON admin_territory_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_territory_assignments_territory_id ON admin_territory_assignments(territory_id);
CREATE INDEX IF NOT EXISTS idx_admin_territory_assignments_district_id ON admin_territory_assignments(district_id);
CREATE INDEX IF NOT EXISTS idx_admin_territory_assignments_assigned_by ON admin_territory_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_shop_id ON vendor_kyc(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_owner_id ON vendor_kyc(owner_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_verified_by ON vendor_kyc(verified_by);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_shop_id ON shop_payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_payouts_approved_by ON shop_payouts(approved_by);
CREATE INDEX IF NOT EXISTS idx_payout_line_items_payout_id ON payout_line_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_line_items_order_id ON payout_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_categories_parent_category_id ON shop_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_category_attributes_category_id ON category_attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_shop_attribute_values_shop_id ON shop_attribute_values(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_attribute_values_attribute_id ON shop_attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_reviewed_by ON fraud_signals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_blocklist_blocked_by ON fraud_blocklist(blocked_by);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user_id ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_processed_by ON data_subject_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_reported_by ON data_breach_log(reported_by);
CREATE INDEX IF NOT EXISTS idx_sync_watermarks_user_id ON sync_watermarks(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_mutations_user_id ON offline_mutations(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_analytics_daily_shop_id ON shop_analytics_daily(shop_id);
CREATE INDEX IF NOT EXISTS idx_universal_catalog_items_FOREIGN ON universal_catalog_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_universal_orders_FOREIGN ON universal_orders(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_universal_orders_FOREIGN ON universal_orders(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_universal_order_items_FOREIGN ON universal_order_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_universal_order_items_FOREIGN ON universal_order_items(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_universal_leads_FOREIGN ON universal_leads(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_universal_leads_FOREIGN ON universal_leads(FOREIGN);
CREATE INDEX IF NOT EXISTS idx_live_tracking_FOREIGN ON live_tracking(FOREIGN);

-- Geospatial GIST Indexes
CREATE INDEX IF NOT EXISTS idx_geo_societies_coordinate ON societies USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_posts_coordinate ON posts USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_local_shops_coordinate ON local_shops USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_property_listings_coordinate ON property_listings USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_delivery_agents_coordinate ON delivery_agents USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_orders_delivery_coordinate ON orders USING GIST (delivery_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_deliveries_pickup_coordinate ON deliveries USING GIST (pickup_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_deliveries_delivery_coordinate ON deliveries USING GIST (delivery_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_carpool_rides_from_coordinate ON carpool_rides USING GIST (from_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_carpool_rides_to_coordinate ON carpool_rides USING GIST (to_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_marketplace_listings_coordinate ON marketplace_listings USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_pet_alerts_last_seen_coordinate ON pet_alerts USING GIST (last_seen_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_health_providers_coordinate ON health_providers USING GIST (coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_events_venue_coordinate ON events USING GIST (venue_coordinate);
CREATE INDEX IF NOT EXISTS idx_geo_user_subscriptions_delivery_coordinate ON user_subscriptions USING GIST (delivery_coordinate);

