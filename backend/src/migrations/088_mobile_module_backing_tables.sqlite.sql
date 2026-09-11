-- Migration 088 (SQLite): backing tables for the mobile feature modules
--
-- apps/mobile ships finished screens for donations, the blood bank, equipment
-- rental, scrap pickup, volunteering, the chef marketplace and the jobs board.
-- Their API calls had no server side at all — an audit of the mobile client
-- found 49 of 225 requests resolving to no route, concentrated in exactly
-- these modules. The screens swallow the resulting 404 in an empty catch, so
-- each one renders as a permanently empty list rather than an error.
--
-- Most of the data already had a home (charity_campaigns, blood_donors,
-- medical_requests, equipment_listings, scrap_pickups, volunteer_tasks,
-- local_job_postings). This migration adds only what was genuinely missing
-- and widens three existing tables to carry fields the screens submit.

-- ─── NGO directory ──────────────────────────────────────────────────────────
-- The donations screen lists partner NGOs with the categories of goods they
-- currently need. charity_campaigns holds fundraisers, not the organisations
-- themselves, so this is a separate concern.
CREATE TABLE IF NOT EXISTS ngo_partners (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    type          TEXT,
    requirements  TEXT,
    pincode       TEXT,
    phone         TEXT,
    address       TEXT,
    is_verified   INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'active',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ngo_partners_pincode ON ngo_partners(pincode, status);

-- ─── Surplus goods rescue ───────────────────────────────────────────────────
-- Distinct from admin_animal_rescue, which is animal rescue dispatch. This is
-- a resident broadcasting surplus food or goods for collection.
CREATE TABLE IF NOT EXISTS donation_rescue_posts (
    id          TEXT PRIMARY KEY,
    poster_id   TEXT,
    item_name   TEXT NOT NULL,
    quantity    TEXT,
    address     TEXT,
    type        TEXT DEFAULT 'Food',
    pincode     TEXT,
    status      TEXT DEFAULT 'open',
    claimed_by  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rescue_posts_status ON donation_rescue_posts(status, created_at);

-- ─── Home-chef marketplace ──────────────────────────────────────────────────
-- chef.routes.js exposed GET /meals against a table that never existed.
CREATE TABLE IF NOT EXISTS chef_meals (
    id               TEXT PRIMARY KEY,
    chef_id          TEXT,
    chef_name        TEXT,
    meal_name        TEXT NOT NULL,
    description      TEXT,
    price            REAL DEFAULT 0,
    is_veg           INTEGER DEFAULT 1,
    available_plates INTEGER DEFAULT 0,
    pincode          TEXT,
    status           TEXT DEFAULT 'active',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chef_meals_status ON chef_meals(status, pincode);

CREATE TABLE IF NOT EXISTS chef_meal_orders (
    id            TEXT PRIMARY KEY,
    meal_id       TEXT REFERENCES chef_meals(id) ON DELETE CASCADE,
    user_id       TEXT,
    plates        INTEGER DEFAULT 1,
    total_amount  REAL DEFAULT 0,
    coins_used    INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'confirmed',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chef_orders_user ON chef_meal_orders(user_id, created_at);

-- ─── Equipment rental transactions ──────────────────────────────────────────
-- equipment_listings holds the catalogue. The rental itself — who has the item,
-- for how long, and the deposit held — had nowhere to live, so
-- /equipment/rent and /equipment/rentals/me could not be implemented.
--
-- Note: equipment_listings.id is INTEGER, so listing_id matches that type.
CREATE TABLE IF NOT EXISTS equipment_rentals (
    id            TEXT PRIMARY KEY,
    listing_id    INTEGER REFERENCES equipment_listings(id) ON DELETE CASCADE,
    renter_id     TEXT,
    days          INTEGER DEFAULT 1,
    total_amount  REAL DEFAULT 0,
    deposit_held  REAL DEFAULT 0,
    coins_used    INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'active',
    rented_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    returned_at   DATETIME
);

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_renter ON equipment_rentals(renter_id, status);

-- ─── charity_campaigns: fields the crowdfund screen submits ─────────────────
-- The create-crowdfund form posts a description and a campaign type; neither
-- had a column, so both were dropped on insert.
ALTER TABLE charity_campaigns ADD COLUMN description TEXT;
ALTER TABLE charity_campaigns ADD COLUMN campaign_type TEXT DEFAULT 'Community';

-- ─── scrap_pickups: fields the pickup form already sends ────────────────────
-- POST /scrap/schedule accepted scrap_type, payout_preference and pincode in
-- its body and silently discarded all three, because the insert only wrote
-- address/preferred_time/estimated_weight. The dealer-facing screen then had
-- no way to show what it was collecting or how the resident wanted paying.
ALTER TABLE scrap_pickups ADD COLUMN scrap_type TEXT;
ALTER TABLE scrap_pickups ADD COLUMN approx_weight TEXT;
ALTER TABLE scrap_pickups ADD COLUMN payout_preference TEXT DEFAULT 'cash';
ALTER TABLE scrap_pickups ADD COLUMN pincode TEXT;
ALTER TABLE scrap_pickups ADD COLUMN dealer_id TEXT;
ALTER TABLE scrap_pickups ADD COLUMN completed_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_scrap_pickups_pincode ON scrap_pickups(pincode, status);

-- ─── blood_donors: registration from outside a society ──────────────────────
-- The table was built for society-scoped donor registers: society_id is NOT
-- NULL with a foreign key to societies, and there is no location of any kind.
-- The public blood-bank screen registers a donor with a blood group and a
-- pincode and no society at all, so it had nowhere to write.
--
-- A sentinel society_id was not an option: the foreign key rejects any value
-- with no matching societies row, and inventing a fake "PUBLIC" society would
-- surface in every society listing. society_id is therefore made nullable,
-- with NULL meaning "public register". SQLite cannot drop NOT NULL in place,
-- so the table is rebuilt.
ALTER TABLE blood_donors ADD COLUMN pincode TEXT;
ALTER TABLE blood_donors ADD COLUMN is_available INTEGER DEFAULT 1;
ALTER TABLE blood_donors ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS blood_donors_rebuilt (
    id              TEXT PRIMARY KEY,
    society_id      TEXT,
    user_id         TEXT NOT NULL,
    blood_group     TEXT NOT NULL,
    last_donated_at TEXT,
    pincode         TEXT,
    is_available    INTEGER DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(society_id) REFERENCES societies(id)
);

INSERT OR IGNORE INTO blood_donors_rebuilt
    (id, society_id, user_id, blood_group, last_donated_at, pincode, is_available, created_at)
SELECT id, society_id, user_id, blood_group, last_donated_at, pincode, is_available, created_at
  FROM blood_donors;

DROP TABLE blood_donors;

ALTER TABLE blood_donors_rebuilt RENAME TO blood_donors;

CREATE INDEX IF NOT EXISTS idx_blood_donors_pincode ON blood_donors(pincode, blood_group);

-- ─── medical_requests: link back to the requesting user ─────────────────────
-- requester_id exists but nothing indexed it, and the blood-bank feed filters
-- open requests by recency.
CREATE INDEX IF NOT EXISTS idx_medical_requests_status ON medical_requests(status, created_at);
