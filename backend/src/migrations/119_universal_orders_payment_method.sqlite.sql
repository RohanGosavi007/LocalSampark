-- 119 (SQLite): universal_orders.payment_method — 'cod', 'razorpay' or 'wallet'.
-- The reasoning is in 119_universal_orders_payment_method.sql. ADD COLUMN has
-- no IF NOT EXISTS here: the runner treats "duplicate column name" as
-- already-applied.

ALTER TABLE universal_orders ADD COLUMN payment_method TEXT DEFAULT 'cod';
