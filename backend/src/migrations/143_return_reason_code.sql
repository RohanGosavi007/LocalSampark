-- ─────────────────────────────────────────────────────────────────────────────
-- 143: the reason for a return as a code from a fixed list (C10)
--
-- order_returns.reason held free text only. The code (wrong_item, damaged,
-- spoiled_or_expired, missing_items, quality_issue, not_as_described, other)
-- is what the review queue and reporting sort on; the customer's own words
-- stay in reason (modules/ecommerce/services/return.service.js).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE order_returns ADD COLUMN IF NOT EXISTS reason_code TEXT;
