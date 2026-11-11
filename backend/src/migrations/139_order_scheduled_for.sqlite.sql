-- ─────────────────────────────────────────────────────────────────────────────
-- 139: an order can be for a chosen time slot instead of ASAP (C8) — SQLite
-- twin of 139_order_scheduled_for.sql. A re-run reports "duplicate column",
-- which the SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders ADD COLUMN scheduled_for TEXT;
