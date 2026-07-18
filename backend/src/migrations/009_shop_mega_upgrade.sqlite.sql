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
