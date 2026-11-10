-- ─────────────────────────────────────────────────────────────────────────────
-- 137: a support ticket can name the order it is about (C14) — SQLite twin of
-- 137_support_ticket_order.sql. Re-runs report "duplicate column", which the
-- SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets ADD COLUMN order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
