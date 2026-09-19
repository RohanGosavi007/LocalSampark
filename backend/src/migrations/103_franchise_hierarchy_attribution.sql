-- ─────────────────────────────────────────────────────────────────────────────
-- 103: Sub-franchise hierarchy, and revenue attribution as data
--
-- Two changes that have to land together, because the second is meaningless
-- without the first.
--
-- ─── Tiered territories ─────────────────────────────────────────────────────
--
-- Migration 101 made a territory exclusive with a partial unique index on
-- franchise_territories(territory_id) WHERE status = 'ACTIVE'. That was right
-- for a flat model and is wrong for the intended one: a Master City franchise
-- covering an area that also contains Neighbourhood sub-franchises is a
-- deliberate overlap, and the old index forbids it outright.
--
-- The rule becomes exclusivity *within a tier*: at most one MASTER and at most
-- one SUB may hold a given territory at a time. Two masters over one area is
-- still impossible, two subs still impossible, and the double-commission case
-- the original index existed to prevent is still prevented — what is now
-- allowed is exactly the containment that was always intended.
--
-- A SUB names the MASTER assignment it sits under. That reference is what makes
-- "who is the parent for this order" answerable without re-deriving geometry,
-- and it is ON DELETE SET NULL rather than CASCADE: releasing a master
-- franchise must not silently delete the sub-franchises operating beneath it.
--
-- ─── Attribution as data, not as code ───────────────────────────────────────
--
-- An order picked up in one franchise's area and delivered in another's has to
-- be split, and the split is a commercial decision that changes without a
-- deploy. Hard-coding a ratio means every renegotiation is a code change, and
-- worse, it means the ratio that was in force when an old order was placed is
-- unrecoverable once the constant moves.
--
-- attribution_policies holds the rule with an effective_from date, so a policy
-- change is an insert and history stays reconstructible. order_territory_
-- attribution records what was actually computed per order, per side, at the
-- time — a ledger, not a view, for the same reason the lead attribution in
-- migration 102 is stored rather than re-derived.
--
-- THE SEEDED POLICY IS A PLACEHOLDER. It attributes 100% to the pickup side,
-- which is the most conservative and auditable default, and it is marked
-- requires_signoff = TRUE. Nothing should pay out against it until the actual
-- commercial split is supplied and a policy row is inserted superseding it.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── Tiered assignment ──────────────────────────────────────────────────────

ALTER TABLE franchise_territories
    ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'MASTER';

ALTER TABLE franchise_territories
    ADD COLUMN IF NOT EXISTS parent_assignment_id UUID
        REFERENCES franchise_territories(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'franchise_territory_tier_valid'
    ) THEN
        ALTER TABLE franchise_territories
            ADD CONSTRAINT franchise_territory_tier_valid CHECK (tier IN ('MASTER', 'SUB'));
    END IF;

    -- A SUB without a parent is an orphan claiming to be part of a hierarchy
    -- that does not exist; a MASTER with one is a contradiction.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'franchise_territory_parent_matches_tier'
    ) THEN
        ALTER TABLE franchise_territories
            ADD CONSTRAINT franchise_territory_parent_matches_tier CHECK (
                (tier = 'SUB' AND parent_assignment_id IS NOT NULL)
                OR (tier = 'MASTER' AND parent_assignment_id IS NULL)
            );
    END IF;
END $$;

-- Replace flat exclusivity with per-tier exclusivity.
DROP INDEX IF EXISTS idx_franchise_territory_exclusive;

CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_territory_exclusive_tier
    ON franchise_territories(territory_id, tier) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_franchise_territory_parent
    ON franchise_territories(parent_assignment_id) WHERE parent_assignment_id IS NOT NULL;

-- ─── Attribution policy ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attribution_policies (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- NULL territory_id is the platform-wide default. A row naming a territory
    -- overrides it for orders whose pickup falls there, which is how a single
    -- renegotiated city is handled without touching everyone else.
    territory_id            TEXT REFERENCES territories(id) ON DELETE CASCADE,

    pickup_share_percent    DECIMAL(5,2) NOT NULL,
    delivery_share_percent  DECIMAL(5,2) NOT NULL,

    -- When pickup and delivery sit under one master, this is the cut taken off
    -- the top before the two shares divide the rest.
    master_override_percent DECIMAL(5,2) NOT NULL DEFAULT 0,

    effective_from          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to            TIMESTAMP,

    -- A policy nobody has signed off must not be paid against. The seeded
    -- default below carries this flag precisely so an automated payout run can
    -- refuse to act on a number the business never chose.
    requires_signoff        BOOLEAN NOT NULL DEFAULT FALSE,
    signed_off_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    signed_off_at           TIMESTAMP,

    note                    TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT attribution_shares_sum_to_whole
        CHECK (pickup_share_percent + delivery_share_percent + master_override_percent = 100),
    CONSTRAINT attribution_shares_non_negative
        CHECK (pickup_share_percent >= 0 AND delivery_share_percent >= 0 AND master_override_percent >= 0)
);

CREATE INDEX IF NOT EXISTS idx_attribution_policy_lookup
    ON attribution_policies(territory_id, effective_from DESC);

-- ─── The per-order ledger ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_territory_attribution (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- PICKUP, DELIVERY or MASTER_OVERRIDE. A cross-boundary order produces two
    -- or three rows; a same-territory order produces one.
    role                    VARCHAR(20) NOT NULL,

    territory_id            TEXT REFERENCES territories(id) ON DELETE SET NULL,
    franchise_partner_id    UUID REFERENCES franchise_partners(id) ON DELETE SET NULL,

    share_percent           DECIMAL(5,2) NOT NULL,
    commission_amount       DECIMAL(12,2) NOT NULL,

    -- The policy actually applied, so an operator asking "why was this split
    -- like that" gets an answer that does not depend on today's policy.
    policy_id               UUID REFERENCES attribution_policies(id) ON DELETE SET NULL,
    computed_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT order_attribution_role_valid
        CHECK (role IN ('PICKUP', 'DELIVERY', 'MASTER_OVERRIDE')),
    CONSTRAINT order_attribution_share_range
        CHECK (share_percent >= 0 AND share_percent <= 100)
);

-- One row per order per role: recomputing an order's attribution must update
-- the ledger rather than silently appending a second, contradictory split.
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_attribution_unique
    ON order_territory_attribution(order_id, role);

CREATE INDEX IF NOT EXISTS idx_order_attribution_partner
    ON order_territory_attribution(franchise_partner_id, computed_at DESC);

-- ─── The placeholder policy ─────────────────────────────────────────────────
--
-- 100% to pickup: the franchise that signed and services the merchant earns the
-- commission, and the delivery area does not affect attribution. Chosen because
-- it is the most conservative default available — it cannot split money between
-- parties who have not agreed a split — and because it is trivially auditable.
--
-- requires_signoff = TRUE. This is not the business's decision, it is a safe
-- stand-in for it.
INSERT INTO attribution_policies
    (territory_id, pickup_share_percent, delivery_share_percent, master_override_percent,
     requires_signoff, note)
SELECT NULL, 100, 0, 0, TRUE,
       'PLACEHOLDER - not a commercial decision. Supersede with the agreed split before any payout run.'
WHERE NOT EXISTS (SELECT 1 FROM attribution_policies WHERE territory_id IS NULL);

COMMIT;
