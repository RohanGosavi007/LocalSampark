-- ─────────────────────────────────────────────────────────────────────────────
-- 102: Territory attribution for CRM leads
--
-- Migration 101 gave the platform a territory model and an exclusivity
-- constraint, but nothing in the domain carried an attribution. crm_leads in
-- particular had no location column at all, which is why GET /franchise/leads
-- could only ever return every lead in the country to every franchise partner
-- who asked: there was no column to filter on.
--
-- These three columns are the attribution, resolved server-side at write time
-- and then never re-derived. Storing the resolution rather than recomputing it
-- on read is deliberate: when a pincode is transferred to a new franchise, a
-- lead that was created and worked under the old partner must keep pointing at
-- that partner, or the transfer would silently rewrite history and move last
-- month's commission with it.
--
-- Existing rows keep NULL. A NULL attribution is not "everyone's" — the scoped
-- queries match on equality, so a NULL lead is invisible to every partner and
-- visible only to administrators. That is the safe direction to fail: an
-- unattributed lead going unseen is a backlog item, an unattributed lead going
-- to everyone is a data leak.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS franchise_partner_id UUID REFERENCES franchise_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_pincode ON crm_leads(pincode);
CREATE INDEX IF NOT EXISTS idx_crm_leads_franchise ON crm_leads(franchise_partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_territory ON crm_leads(territory_id);
