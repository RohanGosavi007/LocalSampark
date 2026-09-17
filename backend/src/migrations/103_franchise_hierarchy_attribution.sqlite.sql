-- SQLite variant of 103_franchise_hierarchy_attribution.sql. See that file for
-- why exclusivity becomes per-tier and why the attribution split is data rather
-- than a constant in the commission code.
--
-- Translations: UUID/VARCHAR -> TEXT (ids supplied by the application),
-- BOOLEAN -> INTEGER 0/1, DECIMAL -> REAL, TIMESTAMP -> DATETIME. SQLite has no
-- `ADD COLUMN IF NOT EXISTS` and no DO blocks; the runner reports and skips a
-- "duplicate column" error, which is what makes these idempotent, and the
-- CHECK constraints ride on the CREATE TABLE statements instead.

ALTER TABLE franchise_territories ADD COLUMN tier TEXT NOT NULL DEFAULT 'MASTER';
ALTER TABLE franchise_territories ADD COLUMN parent_assignment_id TEXT REFERENCES franchise_territories(id) ON DELETE SET NULL;

-- Flat exclusivity out, per-tier exclusivity in. A Master City franchise and a
-- Neighbourhood sub-franchise may now hold the same territory; two masters, or
-- two subs, still cannot.
DROP INDEX IF EXISTS idx_franchise_territory_exclusive;

CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_territory_exclusive_tier
    ON franchise_territories(territory_id, tier) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_franchise_territory_parent
    ON franchise_territories(parent_assignment_id) WHERE parent_assignment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS attribution_policies (
    id                      TEXT PRIMARY KEY,
    territory_id            TEXT REFERENCES territories(id) ON DELETE CASCADE,

    pickup_share_percent    REAL NOT NULL,
    delivery_share_percent  REAL NOT NULL,
    master_override_percent REAL NOT NULL DEFAULT 0,

    effective_from          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to            DATETIME,

    requires_signoff        INTEGER NOT NULL DEFAULT 0,
    signed_off_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
    signed_off_at           DATETIME,

    note                    TEXT,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT attribution_shares_sum_to_whole
        CHECK (pickup_share_percent + delivery_share_percent + master_override_percent = 100),
    CONSTRAINT attribution_shares_non_negative
        CHECK (pickup_share_percent >= 0 AND delivery_share_percent >= 0 AND master_override_percent >= 0)
);

CREATE INDEX IF NOT EXISTS idx_attribution_policy_lookup
    ON attribution_policies(territory_id, effective_from);

CREATE TABLE IF NOT EXISTS order_territory_attribution (
    id                      TEXT PRIMARY KEY,
    order_id                TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    role                    TEXT NOT NULL,

    territory_id            TEXT REFERENCES territories(id) ON DELETE SET NULL,
    franchise_partner_id    TEXT REFERENCES franchise_partners(id) ON DELETE SET NULL,

    share_percent           REAL NOT NULL,
    commission_amount       REAL NOT NULL,

    policy_id               TEXT REFERENCES attribution_policies(id) ON DELETE SET NULL,
    computed_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT order_attribution_role_valid
        CHECK (role IN ('PICKUP', 'DELIVERY', 'MASTER_OVERRIDE')),
    CONSTRAINT order_attribution_share_range
        CHECK (share_percent >= 0 AND share_percent <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_attribution_unique
    ON order_territory_attribution(order_id, role);

CREATE INDEX IF NOT EXISTS idx_order_attribution_partner
    ON order_territory_attribution(franchise_partner_id, computed_at);

-- The placeholder policy: 100% to pickup, flagged as needing sign-off so a
-- payout run refuses to act on a number the business never chose. See the
-- Postgres file for the full reasoning.
INSERT INTO attribution_policies
    (id, territory_id, pickup_share_percent, delivery_share_percent, master_override_percent,
     requires_signoff, note)
SELECT 'attribution-policy-default', NULL, 100, 0, 0, 1,
       'PLACEHOLDER - not a commercial decision. Supersede with the agreed split before any payout run.'
WHERE NOT EXISTS (SELECT 1 FROM attribution_policies WHERE territory_id IS NULL);
