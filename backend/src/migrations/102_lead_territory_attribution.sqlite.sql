-- SQLite variant of 102_lead_territory_attribution.sql. See that file for why
-- the attribution is stored rather than re-derived on read.
--
-- SQLite has no `ADD COLUMN IF NOT EXISTS`; the runner reports and skips a
-- "duplicate column" error, which is what makes these idempotent, the same
-- arrangement migrations 097 and 101 rely on.

ALTER TABLE crm_leads ADD COLUMN pincode TEXT;
ALTER TABLE crm_leads ADD COLUMN territory_id TEXT REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE crm_leads ADD COLUMN franchise_partner_id TEXT REFERENCES franchise_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_pincode ON crm_leads(pincode);
CREATE INDEX IF NOT EXISTS idx_crm_leads_franchise ON crm_leads(franchise_partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_territory ON crm_leads(territory_id);
