-- ─────────────────────────────────────────────────────────────────────────────
-- 134: FK index coverage for the after-order tables (B3 / B5)
--
-- 133_after_order_experience added order_returns.user_id,
-- order_returns.verified_by and trust_reviews.order_id as foreign keys without
-- an index on the referencing column. Deleting a user or an order then scans
-- the whole child table, and fkIndexCoverage.test.js flags all three.
--
-- Forward-only: 133 is left exactly as committed, so an environment that has
-- already applied it gets these indexes from here.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_order_returns_user_id ON order_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_verified_by ON order_returns(verified_by);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_order_id ON trust_reviews(order_id);
