-- ─────────────────────────────────────────────────────────────────────────────
-- 136: a grievance's resolution is recorded, not discarded (A11) — SQLite twin
-- of 136_support_ticket_resolution.sql. Re-runs report "duplicate column",
-- which the SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets ADD COLUMN resolution TEXT;
ALTER TABLE support_tickets ADD COLUMN resolved_at TEXT;
