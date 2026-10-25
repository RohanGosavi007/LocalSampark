-- ─────────────────────────────────────────────────────────────────────────────
-- 119: universal_orders.payment_method
--
-- A universal order had no record of how it was to be paid. The web checkout
-- wrote "Payment: RAZORPAY" into the free-text notes column, and nothing read
-- it: every order was fulfilled as though payment were someone else's concern.
--
-- The column holds 'cod', 'razorpay' or 'wallet'. Together with payment_status
-- (117) it lets the shop's order queue tell a paid order from one still
-- waiting on Razorpay.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE universal_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';
