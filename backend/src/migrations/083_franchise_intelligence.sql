-- Migration 083: region scoping and an outreach log for franchise intelligence
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

ALTER TABLE franchise_lead_crm ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_franchise_lead_crm_region
    ON franchise_lead_crm(region_id);

CREATE TABLE IF NOT EXISTS franchise_outreach_log (
    id         VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    region_id  UUID REFERENCES regions(id),
    shop_id    UUID REFERENCES local_shops(id) ON DELETE SET NULL,
    method     VARCHAR(100),
    notes      TEXT,
    logged_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_franchise_outreach_region
    ON franchise_outreach_log(region_id, created_at);
