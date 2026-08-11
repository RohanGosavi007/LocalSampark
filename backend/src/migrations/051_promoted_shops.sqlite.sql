-- Migration 051: Ads Engine & Promoted Shops
-- Adds promoted status to local shops for the global search algorithm

ALTER TABLE local_shops ADD COLUMN is_promoted BOOLEAN DEFAULT 0;

-- Trigger to re-sync FTS5 if a shop's promoted status changes
-- Note: the FTS index doesn't have is_promoted, but we can rely on standard SQL fallback for sorting or just keep it simple.

-- Seed some mock promoted shops
UPDATE local_shops SET is_promoted = 1 WHERE id IN (SELECT id FROM local_shops LIMIT 2);
