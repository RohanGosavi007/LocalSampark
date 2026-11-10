-- ─────────────────────────────────────────────────────────────────────────────
-- 137: a support ticket can name the order it is about (C14)
--
-- POST /support/tickets accepted `orderId` and dropped it: the ticket row had
-- nowhere to keep it, so "help with this order" reached the support queue
-- without saying which order. Text, as orders.id is compared as text across
-- both engines.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
