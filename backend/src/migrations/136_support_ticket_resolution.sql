-- ─────────────────────────────────────────────────────────────────────────────
-- 136: a grievance's resolution is recorded, not discarded (A11)
--
-- PUT /admin/commerce/grievances/:id accepted a `resolution` and wrote it only
-- into the audit log, so the ticket itself never said how it was settled and
-- the customer could not be shown the answer. The statutory grievance register
-- needs both the reply and when it was given.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
