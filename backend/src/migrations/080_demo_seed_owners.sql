-- Migration 080: owners for the demo property and event seeds
--
-- Migration 024 seeds two property listings owned by 'user_owner_1' and
-- 'user_owner_2', and two community events organised by 'org_1' and 'org_2'.
-- None of those users has ever existed, so with foreign keys enforced the seeds
-- cannot apply and the demo listings and events do not appear.
--
-- The seeds are investor demo data and are meant to be visible, so the missing
-- owners are created here and the rows re-inserted. The users are marked with a
-- clearly non-real phone range so they are easy to recognise as demo accounts.

DO $$
BEGIN
  -- Insert demo users with valid UUIDs
  INSERT INTO users (id, full_name, phone_number, role) VALUES
  ('a0000000-0000-4000-a000-000000000001', 'Demo Property Owner', '9000000001', 'user'),
  ('a0000000-0000-4000-a000-000000000002', 'Demo Commercial Owner', '9000000002', 'user'),
  ('a0000000-0000-4000-a000-000000000003', 'Demo Community Organiser', '9000000003', 'user'),
  ('a0000000-0000-4000-a000-000000000004', 'Demo Cultural Organiser', '9000000004', 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO property_listings (id, user_id, title, description, property_type, listing_type, price, deposit, amenities, is_verified, is_active) VALUES
  ('b0000000-0000-4000-b000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Spacious 2BHK Apartment', 'Gated community with gym and security near MG Road.', 'flat', 'rent', 22000.00, 50000.00, '["gym", "parking"]'::jsonb, true, true),
  ('b0000000-0000-4000-b000-000000000002', 'a0000000-0000-4000-a000-000000000002', 'Commercial Shop Space', 'Prime road facing retail shop in Main Market.', 'commercial', 'sale', 4500000.00, 0.00, '["main_road"]'::jsonb, true, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO community_events (id, organizer_id, title, category, event_date, time_slot, venue_address, pincode, ticket_price, description) VALUES
  ('c0000000-0000-4000-c000-000000000001', 'a0000000-0000-4000-a000-000000000003', 'Neighborhood Organic Farming Workshop', 'Workshop', '2026-08-10', '10:00 AM - 01:00 PM', 'Community Hall, Sector 4', '411001', 0.00, 'Learn urban gardening techniques.'),
  ('c0000000-0000-4000-c000-000000000002', 'a0000000-0000-4000-a000-000000000004', 'Local Art & Craft Mela', 'Cultural', '2026-08-15', '04:00 PM - 09:00 PM', 'Town Square Ground', '411001', 50.00, 'Support local artisans and handicraft vendors.')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration 080 notice: %', SQLERRM;
END $$;
