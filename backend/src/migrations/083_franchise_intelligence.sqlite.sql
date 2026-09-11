-- Migration 083 (SQLite): region scoping and an outreach log for franchise intelligence
--
-- franchise-intelligence.routes.js scopes everything by a :zoneId path
-- parameter. Shops are scoped with region_id (-> regions.id), the same column
-- franchise_partners uses, but franchise_lead_crm had no region column at all,
-- so leads could not be filtered by territory. It is added here rather than
-- filtering on pincode, to match how the rest of the platform scopes.
--
-- franchise_outreach_log is new. The outreach endpoint previously replied
-- "Outreach logged successfully" without writing anything, so no outreach
-- attempt has ever been recorded.

ALTER TABLE franchise_lead_crm ADD COLUMN region_id TEXT REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_franchise_lead_crm_region
    ON franchise_lead_crm(region_id);

CREATE TABLE IF NOT EXISTS franchise_outreach_log (
    id         TEXT PRIMARY KEY,
    region_id  TEXT REFERENCES regions(id),
    shop_id    TEXT REFERENCES local_shops(id) ON DELETE SET NULL,
    method     TEXT,
    notes      TEXT,
    logged_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_franchise_outreach_region
    ON franchise_outreach_log(region_id, created_at);
