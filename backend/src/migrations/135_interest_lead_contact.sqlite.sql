-- ─────────────────────────────────────────────────────────────────────────────
-- 135: contact details on feature interest leads — SQLite twin of
-- 135_interest_lead_contact.sql. Re-runs report "duplicate column", which the
-- SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE feature_interest_leads ADD COLUMN contact_name TEXT;
ALTER TABLE feature_interest_leads ADD COLUMN contact_phone TEXT;
ALTER TABLE feature_interest_leads ADD COLUMN details TEXT;
CREATE INDEX IF NOT EXISTS idx_feature_interest_leads_feature ON feature_interest_leads(feature_key, created_at);
