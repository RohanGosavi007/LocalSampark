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
