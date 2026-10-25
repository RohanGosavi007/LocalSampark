-- ─────────────────────────────────────────────────────────────────────────────
-- 113: carpool and jobs columns that only SQLite ever received
--
-- 064_tri_category_upgrade and 065_phase_a_advanced exist as .sqlite.sql files
-- with no PostgreSQL counterpart. The tables they create were later mirrored by
-- 068 and 076, but the columns they ADD to tables that already existed in
-- init.sql were not, so on PostgreSQL those tables still have their original
-- shape while the application writes to the newer one:
--
--   carpool.routes.js   creating a ride names 13 columns carpool_rides lacks;
--                       booking a seat names carpool_bookings.bid_amount
--   jobs.routes.js      posting a job names 12 columns local_job_postings
--                       lacks; applying names 4 that job_applications lacks
--
-- Each fails with `column "…" of relation "…" does not exist`. Found by
-- comparing a model of this migration set against the migrated SQLite schema.
--
-- Types follow the SQLite declarations. The flags stay INTEGER rather than
-- becoming BOOLEAN because the code compares them with integer literals
-- (`remote_allowed = 1`) and binds 1 / 0, which a BOOLEAN column rejects.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── carpool_rides ──────────────────────────────────────────────────────────
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS vehicle_id TEXT;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS ride_type TEXT DEFAULT 'car';
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'any';
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS is_intercity INTEGER DEFAULT 0;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS luggage_space INTEGER DEFAULT 0;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS corporate_only INTEGER DEFAULT 0;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS max_detour_km DOUBLE PRECISION DEFAULT 5;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS estimated_distance_km DOUBLE PRECISION;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS from_lat DOUBLE PRECISION;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS from_lng DOUBLE PRECISION;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS to_lat DOUBLE PRECISION;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS to_lng DOUBLE PRECISION;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS ride_date TEXT;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS recurring_id TEXT;
ALTER TABLE carpool_rides ADD COLUMN IF NOT EXISTS fare_type TEXT DEFAULT 'fixed';

-- ── carpool_bookings ───────────────────────────────────────────────────────
ALTER TABLE carpool_bookings ADD COLUMN IF NOT EXISTS bid_amount DOUBLE PRECISION;
ALTER TABLE carpool_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE carpool_bookings ADD COLUMN IF NOT EXISTS rated INTEGER DEFAULT 0;

-- ── local_job_postings ─────────────────────────────────────────────────────
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS experience_min INTEGER DEFAULT 0;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS experience_max INTEGER;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS skills_required TEXT DEFAULT '[]';
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'private';
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS remote_allowed INTEGER DEFAULT 0;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal';
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS applications_count INTEGER DEFAULT 0;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS description_html TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS work_hours TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- ── job_applications ───────────────────────────────────────────────────────
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_id TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS match_score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'applied';
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS voice_intro_url TEXT;

-- ── job_postings ───────────────────────────────────────────────────────────
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS referral_bounty DOUBLE PRECISION DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS is_walkin INTEGER DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS walkin_event_id TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS application_deadline TEXT;

-- ── local_shops ────────────────────────────────────────────────────────────
-- Declared in init.sqlite.sql; read by the shop search and tag filters.
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
