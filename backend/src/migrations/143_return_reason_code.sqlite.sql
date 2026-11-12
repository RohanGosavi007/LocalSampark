-- ─────────────────────────────────────────────────────────────────────────────
-- 143: the reason for a return as a code from a fixed list (C10) — SQLite twin
-- of 143_return_reason_code.sql. A re-run reports "duplicate column", which the
-- SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE order_returns ADD COLUMN reason_code TEXT;
