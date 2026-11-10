-- ─────────────────────────────────────────────────────────────────────────────
-- 134: FK index coverage for the after-order tables (B3 / B5) — SQLite twin
--
-- Same three indexes as 134_after_order_fk_index_parity.sql. The foreign key
-- that 133.sql declares on trust_reviews.order_id, and that the SQLite twin of
-- 133 omitted, is restored by 134_trust_reviews_order_fk.js: SQLite cannot add
-- a constraint to an existing column without rebuilding the table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_order_returns_user_id ON order_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_verified_by ON order_returns(verified_by);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_order_id ON trust_reviews(order_id);
