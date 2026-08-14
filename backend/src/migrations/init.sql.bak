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
