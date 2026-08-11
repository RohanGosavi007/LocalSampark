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

    created_at TEXT DEFAULT (datetime('now'))
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
