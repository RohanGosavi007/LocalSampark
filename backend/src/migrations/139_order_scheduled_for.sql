-- ─────────────────────────────────────────────────────────────────────────────
-- 139: an order can be for a chosen time slot instead of ASAP (C8)
--
-- The ISO start of the one-hour window the customer chose
-- (services/deliverySlots.service.js); NULL means as soon as possible. Text,
-- written by the application, so both engines store the same instant.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TEXT;
