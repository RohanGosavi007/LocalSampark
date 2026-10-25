-- ─────────────────────────────────────────────────────────────────────────────
-- 131: Rider Fleet KYC & Banking Details (R1, R2, R5)
--
-- Adds statutory banking, document images, and admin rejection tracking
-- to delivery_agents for verified delivery fleet operations.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS aadhaar_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
