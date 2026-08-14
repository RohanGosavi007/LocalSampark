-- 057: Shop-scoped loyalty.
--
-- The existing loyalty_* tables model a single platform-wide Sampark Coins
-- balance keyed on user_id alone. That cannot express "points earned at this
-- shop", which is what the shop page asks for, so this adds a parallel
-- shop-scoped model rather than overloading the platform balance.
--
-- Design notes:
--   * The ledger is append-only, matching the wallet ledger already used at
--     checkout. Balances are maintained on the account row inside the same
--     transaction as the ledger insert, so the two cannot drift.
--   * Each shop configures its own earn and burn rates; a marketplace cannot
--     assume one rate across independent merchants.
--   * order_id is UNIQUE per direction, so a retried checkout cannot credit
--     the same order twice.

BEGIN;

-- ─── Per-shop programme configuration ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_loyalty_programs (
    shop_id             UUID PRIMARY KEY REFERENCES local_shops(id) ON DELETE CASCADE,
    is_enabled          BOOLEAN       NOT NULL DEFAULT TRUE,
    -- Points granted per 100 currency units spent.
    points_per_hundred  INT           NOT NULL DEFAULT 5,
    -- Currency value of one point when redeemed.
    point_value         DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    min_order_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_redeem_points   INT           NOT NULL DEFAULT 100,
    welcome_bonus       INT           NOT NULL DEFAULT 0,
    -- NULL means points never expire.
    points_expire_days  INT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shop_loyalty_rates_sane CHECK (
        points_per_hundred >= 0 AND point_value >= 0 AND min_redeem_points >= 0
    )
);

-- ─── A customer's standing at one shop ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_loyalty_accounts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id           UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_balance    INT  NOT NULL DEFAULT 0,
    lifetime_points   INT  NOT NULL DEFAULT 0,
    -- Consecutive days with a qualifying order; surfaced as "streak" in the UI.
    current_streak    INT  NOT NULL DEFAULT 0,
    longest_streak    INT  NOT NULL DEFAULT 0,
    last_order_date   DATE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shop_loyalty_accounts_unique UNIQUE (shop_id, user_id),
    CONSTRAINT shop_loyalty_balance_non_negative CHECK (points_balance >= 0)
);

-- ─── Append-only ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_loyalty_transactions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id     UUID NOT NULL REFERENCES shop_loyalty_accounts(id) ON DELETE CASCADE,
    shop_id        UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Positive credits, negative debits; the sign carries the direction.
    points         INT  NOT NULL,
    kind           VARCHAR(20) NOT NULL,  -- earn, redeem, expire, adjust, welcome
    order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
    description    TEXT,
    expires_at     TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shop_loyalty_kind_valid CHECK (kind IN ('earn','redeem','expire','adjust','welcome')),
    CONSTRAINT shop_loyalty_points_non_zero CHECK (points <> 0)
);

-- One earn row per order, so a retried checkout cannot double-credit.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_loyalty_earn_once
    ON shop_loyalty_transactions(order_id)
    WHERE kind = 'earn' AND order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_loyalty_accounts_user ON shop_loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_loyalty_accounts_shop ON shop_loyalty_accounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_loyalty_tx_account    ON shop_loyalty_transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_loyalty_tx_expiry     ON shop_loyalty_transactions(expires_at)
    WHERE expires_at IS NOT NULL;

COMMIT;
