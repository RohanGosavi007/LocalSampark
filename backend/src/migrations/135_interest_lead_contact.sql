-- ─────────────────────────────────────────────────────────────────────────────
-- 135: contact details on feature interest leads
--
-- POST /gtm/interest-lead backs two public forms: the "Coming soon — notify
-- me" waitlist for modules that are off at launch, and the franchise partner
-- application on /franchise. A franchise application without a name or phone
-- number cannot be followed up, so the lead can now carry them (optional:
-- the waitlist needs only a pincode).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE feature_interest_leads ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE feature_interest_leads ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE feature_interest_leads ADD COLUMN IF NOT EXISTS details TEXT;
CREATE INDEX IF NOT EXISTS idx_feature_interest_leads_feature ON feature_interest_leads(feature_key, created_at);
