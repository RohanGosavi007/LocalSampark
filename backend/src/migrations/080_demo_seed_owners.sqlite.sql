-- Migration 080 (SQLite): owners for the demo property and event seeds
--
-- Migration 024 seeds two property listings owned by 'user_owner_1' and
-- 'user_owner_2', and two community events organised by 'org_1' and 'org_2'.
-- None of those users has ever existed. While foreign keys were unenforced the
-- rows inserted anyway and pointed at nothing; now that enforcement is on, the
-- inserts fail outright and the demo listings and events do not appear at all.
--
-- The seeds are investor demo data and are meant to be visible, so the missing
-- owners are created here and the rows re-inserted. The users are marked with a
-- clearly non-real phone range so they are easy to recognise as demo accounts.

INSERT OR IGNORE INTO users (id, full_name, phone_number, phone, role) VALUES
('user_owner_1', 'Demo Property Owner', '9000000001', '9000000001', 'user'),
('user_owner_2', 'Demo Commercial Owner', '9000000002', '9000000002', 'user'),
('org_1', 'Demo Community Organiser', '9000000003', '9000000003', 'user'),
('org_2', 'Demo Cultural Organiser', '9000000004', '9000000004', 'user');

-- Re-run the two seeds from 024 that could not apply.
INSERT OR IGNORE INTO property_listings (id, user_id, title, description, property_type, listing_type, price, deposit, amenities, is_verified, is_active) VALUES
('prop_1', 'user_owner_1', 'Spacious 2BHK Apartment', 'Gated community with gym and security near MG Road.', 'flat', 'rent', 22000.00, 50000.00, '["gym", "parking"]', 1, 1),
('prop_2', 'user_owner_2', 'Commercial Shop Space', 'Prime road facing retail shop in Main Market.', 'commercial', 'sale', 4500000.00, 0.00, '["main_road"]', 1, 1);

INSERT OR IGNORE INTO community_events (id, organizer_id, title, category, event_date, time_slot, venue_address, pincode, ticket_price, description) VALUES
('evt_1', 'org_1', 'Neighborhood Organic Farming Workshop', 'Workshop', '2026-08-10', '10:00 AM - 01:00 PM', 'Community Hall, Sector 4', '411001', 0.00, 'Learn urban gardening techniques.'),
('evt_2', 'org_2', 'Local Art & Craft Mela', 'Cultural', '2026-08-15', '04:00 PM - 09:00 PM', 'Town Square Ground', '411001', 50.00, 'Support local artisans and handicraft vendors.');
