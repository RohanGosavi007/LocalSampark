-- Indexes for multi-tenant (region-scoped) filters.
--
-- These three tables are queried by region_id on admin and franchise dashboards
-- but carried no index on that column, so each of those screens drove a full
-- table scan. local_shops was already covered (idx_local_shops_region and the
-- composite idx_local_shops_active), which is why the gap was easy to miss —
-- the shop directory itself is fast.
--
-- Composites are ordered equality-first, range-second, so the index serves both
-- the filter and the ORDER BY that follows it. Every column referenced here was
-- confirmed present before writing this.

BEGIN;

-- users WHERE region_id = $1
-- Region admin listings additionally filter to active accounts and sort by
-- signup date, so the composite covers the whole clause.
CREATE INDEX IF NOT EXISTS idx_users_region_id ON users(region_id);
CREATE INDEX IF NOT EXISTS idx_users_region_active ON users(region_id, is_active, created_at DESC);

-- revenue_transactions WHERE region_id = $1
-- Revenue reporting is region + period, so created_at belongs in the index.
CREATE INDEX IF NOT EXISTS idx_revenue_tx_region ON revenue_transactions(region_id);
CREATE INDEX IF NOT EXISTS idx_revenue_tx_region_created ON revenue_transactions(region_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_tx_region_status ON revenue_transactions(region_id, status);

-- franchise_partners: joined on region_id, and separately filtered by
-- territory_pincode + status when resolving which partner owns an area.
CREATE INDEX IF NOT EXISTS idx_franchise_partners_region ON franchise_partners(region_id);
CREATE INDEX IF NOT EXISTS idx_franchise_partners_status ON franchise_partners(status);
CREATE INDEX IF NOT EXISTS idx_franchise_partners_pincode_status
  ON franchise_partners(territory_pincode, status);

COMMIT;
