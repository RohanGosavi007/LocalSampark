-- Seed Data for Dhanori, Pune Pilot
INSERT INTO regions (name, state, district, city, pincode, country, latitude, longitude, radius_km, is_active)
VALUES ('Dhanori', 'Maharashtra', 'Pune', 'Pune', '411015', 'India', 18.5786, 73.8967, 5.0, 1)
ON CONFLICT (name) DO NOTHING;

-- Seed Admin Config settings
INSERT INTO admin_config (config_key, config_value, config_category, description)
VALUES 
('feed_radius_km', '3.5', 'community', 'Maximum radius for community feed posts'),
('delivery_base_fee', '20.00', 'delivery', 'Base delivery charge in INR'),
('delivery_per_km_fee', '8.00', 'delivery', 'Per kilometer delivery charge in INR'),
('points_per_post', '5', 'loyalty', 'Loyalty points awarded for creating a post')
ON CONFLICT (config_key) DO NOTHING;

-- Seed Societies in Dhanori
INSERT INTO societies (region_id, name, address)
VALUES 
((SELECT id FROM regions WHERE name = 'Dhanori'), 'Ganga Aria', 'Dhanori Road, Dhanori, Pune'),
((SELECT id FROM regions WHERE name = 'Dhanori'), 'Prasanna Goldfields', 'Laxmi Nagar, Dhanori, Pune'),
((SELECT id FROM regions WHERE name = 'Dhanori'), 'Choice Goodwill Metropolis', 'Dhanori Chowk, Dhanori, Pune')
ON CONFLICT DO NOTHING;

-- Seed some mock users (with dummy phone numbers)
INSERT INTO users (phone_number, full_name, role, is_verified, is_active, region_id)
VALUES 
('+919999999991', 'Super Admin Dev', 'super_admin', true, true, (SELECT id FROM regions WHERE name = 'Dhanori')),
('+919999999992', 'Rajesh Sharma', 'shop_owner', true, true, (SELECT id FROM regions WHERE name = 'Dhanori')),
('+919999999993', 'Amit Patil', 'user', true, true, (SELECT id FROM regions WHERE name = 'Dhanori')),
('+919999999994', 'Rahul Shinde', 'delivery_agent', true, true, (SELECT id FROM regions WHERE name = 'Dhanori'))
ON CONFLICT (phone_number) DO NOTHING;

-- Seed Wallets for users
INSERT INTO wallets (user_id, balance)
VALUES 
((SELECT id FROM users WHERE phone_number = '+919999999991'), 1000.00),
((SELECT id FROM users WHERE phone_number = '+919999999992'), 500.00),
((SELECT id FROM users WHERE phone_number = '+919999999993'), 250.00),
((SELECT id FROM users WHERE phone_number = '+919999999994'), 100.00)
ON CONFLICT (user_id) DO NOTHING;

-- Seed Shops
INSERT INTO local_shops (owner_id, region_id, name, description, category, phone_number, address, coordinate, is_verified, is_premium, approval_status, is_active)
VALUES 
(
  (SELECT id FROM users WHERE phone_number = '+919999999992'),
  (SELECT id FROM regions WHERE name = 'Dhanori'),
  'Sharma Grocery & Dairy',
  'Fresh dairy products, grains, vegetables, and daily household needs.',
  'Grocery',
  '+919999999992',
  'Shop 4, Ganga Aria Commercial, Dhanori, Pune',
  'POINT(73.8967 18.5786)',
  true,
  true,
  'approved',
  1
)
ON CONFLICT DO NOTHING;

-- Seed Products for the shop
INSERT INTO shop_products (shop_id, name, description, price, is_available)
VALUES 
((SELECT id FROM local_shops WHERE name = 'Sharma Grocery & Dairy'), 'Amul Taaza Milk 1L', 'Pasteurized toned milk', 56.00, true),
((SELECT id FROM local_shops WHERE name = 'Sharma Grocery & Dairy'), 'Toor Dal 1kg', 'Premium quality unpolished toor dal', 120.00, true),
((SELECT id FROM local_shops WHERE name = 'Sharma Grocery & Dairy'), 'Fresh Paneer 200g', 'Soft and fresh cottage cheese', 80.00, true)
ON CONFLICT DO NOTHING;

-- Seed Loyalty Tiers
INSERT INTO loyalty_tiers (name, min_points, perks)
VALUES 
('Naya Padosi', 0, '[{"perk_name": "basic_access", "perk_value": "true"}]'),
('Active Padosi', 100, '[{"perk_name": "priority_feed", "perk_value": "true"}]'),
('Super Padosi', 500, '[{"perk_name": "free_delivery_count", "perk_value": "2"}]'),
('Sampark Champion', 2000, '[{"perk_name": "vip_support", "perk_value": "true"}]')
ON CONFLICT DO NOTHING;
