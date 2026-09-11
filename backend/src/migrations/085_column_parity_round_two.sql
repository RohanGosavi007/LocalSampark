-- Migration 085: columns and tables the application queries but never had
--
-- Everything here is a column or table that application code references and no
-- schema ever declared. Where the table already had a column meaning the same
-- thing -- actual_start for a guard's check-in, file_url for a document's URL,
-- stock_quantity for stock -- the code was corrected instead, so nothing below
-- duplicates an existing concept.
--
-- global_catalog is the largest gap: catalog.master.js matches shop inventory
-- against a master SKU catalog by barcode and trigram similarity, and neither
-- the table nor the shop_products.master_sku_id that links to it existed, so the
-- entire catalog engine could never run.

-- The master SKU catalog behind MasterCatalogService.
CREATE TABLE IF NOT EXISTS global_catalog (
    id              VARCHAR(255) PRIMARY KEY,
    barcode         TEXT,
    name            TEXT NOT NULL,
    brand           TEXT,
    variant_label   TEXT,
    weight          REAL,
    unit            TEXT,
    image_url       TEXT,
    parent_group_id TEXT,
    category        TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_global_catalog_barcode ON global_catalog(barcode);
CREATE INDEX IF NOT EXISTS idx_global_catalog_group   ON global_catalog(parent_group_id, weight);

-- Links a shop's own product row to the master SKU it corresponds to.
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS master_sku_id TEXT REFERENCES global_catalog(id);
CREATE INDEX IF NOT EXISTS idx_shop_products_master_sku ON shop_products(master_sku_id);

-- user.routes.js records an identity document's number and verification state.
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- guard-shift.controller.js records who rostered the shift.
ALTER TABLE society_guard_shifts ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id);

-- admin-marketing.controller.js sends broadcasts with a deep link and a
-- displayed sender, and tracks send state.
ALTER TABLE admin_broadcasts ADD COLUMN IF NOT EXISTS deep_link TEXT;
ALTER TABLE admin_broadcasts ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE admin_broadcasts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- equipment.controller.js writes a description and photo, and lists by date.
ALTER TABLE equipment_listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE equipment_listings ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE equipment_listings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- medical_requests serves two features: an admin logging a patient emergency
-- (patient_name, blood_group) and a resident requesting an item through
-- services/medical.controller.js. The resident-side columns were missing.
ALTER TABLE medical_requests ADD COLUMN IF NOT EXISTS requester_id TEXT REFERENCES users(id);
ALTER TABLE medical_requests ADD COLUMN IF NOT EXISTS required_item TEXT;
ALTER TABLE medical_requests ADD COLUMN IF NOT EXISTS description TEXT;

-- subscription.routes.js presents plans with an icon, the providing vendor and
-- a delivery schedule.
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS schedule TEXT;

-- bills.routes.js scopes utility bills to a user and names the biller.
ALTER TABLE utility_bills ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE utility_bills ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_user ON utility_bills(user_id);

ALTER TABLE volunteer_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE volunteer_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE admin_krishi_listings ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE admin_krishi_listings ADD COLUMN IF NOT EXISTS seller_name TEXT;

ALTER TABLE admin_backups ADD COLUMN IF NOT EXISTS initiator TEXT;

ALTER TABLE admin_charity_campaigns ADD COLUMN IF NOT EXISTS campaign_title TEXT;

-- carpoolSocket.js distinguishes plain chat from system notices.
ALTER TABLE carpool_chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- cart.routes.js stores per-line selections such as size or add-ons.
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS custom_options TEXT;

ALTER TABLE franchise_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- billing-automation.job.js bills per month and year.
ALTER TABLE society_maintenance_bills ADD COLUMN IF NOT EXISTS year INTEGER;

ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;
ALTER TABLE loyalty_redemptions ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP;

-- job.routes.js shows a candidate's summary and where they are based.
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS location TEXT;

-- premium.routes.js tracks which tier a subscription is on and when it began.
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;

-- campaigns.routes.js prices campaigns by run length and targeting radius.
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS radius_km REAL;

-- job_postings is reached two ways: by the employer who posted it, and by the
-- company profile it belongs to. shop_id covers neither.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS employer_id TEXT REFERENCES users(id);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES company_profiles(id);
CREATE INDEX IF NOT EXISTS idx_job_postings_employer ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_company  ON job_postings(company_id);
