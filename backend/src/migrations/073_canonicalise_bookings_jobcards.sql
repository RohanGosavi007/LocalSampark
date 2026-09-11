-- Migration 073 (PostgreSQL): home_service_bookings and job_cards
--
-- home_service_bookings has 8 columns; the booking INSERT names 12, seven of
-- which do not exist:
--     INSERT INTO home_service_bookings (
--       id, booking_ref, user_id, provider_id, category_id, booking_date,
--       time_slot, service_address, pincode, problem_description,
--       inspection_fee, status)
--     src/modules/services/routes/home-services.routes.js:73
-- So creating a home-service booking fails outright. The columns are added
-- here; `user_id` is naming drift for the existing customer_id and is fixed in
-- the code instead.
--
-- job_cards: actual_cost, assigned_technician and problem_description are
-- naming drift for final_cost, assigned_to and description, fixed in code. The
-- rest are genuinely absent. `photos` is added as its own column rather than
-- folded into item_photos or progress_photos — the routes use all three for
-- different stages, so collapsing them would be a guess about intent.

-- ── home_service_bookings ──────────────────────────────────────────────────
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS booking_ref TEXT;
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS booking_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS service_address TEXT;
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE home_service_bookings ADD COLUMN IF NOT EXISTS problem_description TEXT;

CREATE INDEX IF NOT EXISTS idx_hsb_customer ON home_service_bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_hsb_date ON home_service_bookings(booking_date);

-- ── job_cards ──────────────────────────────────────────────────────────────
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS vehicle_info TEXT;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS photos TEXT DEFAULT '[]';
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS status_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_job_cards_shop_status ON job_cards(shop_id, status);
