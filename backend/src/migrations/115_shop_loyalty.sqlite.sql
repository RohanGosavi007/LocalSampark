-- ─────────────────────────────────────────────────────────────────────────────
-- 115 (SQLite): shop-scoped loyalty
--
-- 057_shop_loyalty.sql created these three tables on PostgreSQL only. The
-- routes and the service that use them are engine-neutral, so on SQLite —
-- every development machine and the whole test suite — each loyalty call
-- failed with "no such table: shop_loyalty_programs". This is 057 in SQLite's
-- types; the design notes are in that file and are not repeated here.
--
-- The primary keys of the account and ledger tables have no default. The
-- SQLite driver supplies a UUID when an INSERT names no id, which is what
-- uuid_generate_v4() does in the PostgreSQL definition.
--
-- No BEGIN/COMMIT: the runner applies this file statement by statement, and
-- its splitter reads a bare BEGIN as the start of a trigger body.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Per-shop programme configuration ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_loyalty_programs (
    shop_id             TEXT PRIMARY KEY REFERENCES local_shops(id) ON DELETE CASCADE,
    is_enabled          INTEGER NOT NULL DEFAULT 1,
    points_per_hundred  INTEGER NOT NULL DEFAULT 5,
    point_value         REAL    NOT NULL DEFAULT 1.0,
    min_order_amount    REAL    NOT NULL DEFAULT 0,
    min_redeem_points   INTEGER NOT NULL DEFAULT 100,
    welcome_bonus       INTEGER NOT NULL DEFAULT 0,
    points_expire_days  INTEGER,
    created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shop_loyalty_rates_sane CHECK (
        points_per_hundred >= 0 AND point_value >= 0 AND min_redeem_points >= 0
    )
);

-- ─── A customer's standing at one shop ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_loyalty_accounts (
    id                TEXT PRIMARY KEY,
    shop_id           TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_balance    INTEGER NOT NULL DEFAULT 0,
    lifetime_points   INTEGER NOT NULL DEFAULT 0,
    current_streak    INTEGER NOT NULL DEFAULT 0,
    longest_streak    INTEGER NOT NULL DEFAULT 0,
    last_order_date   TEXT,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shop_loyalty_accounts_unique UNIQUE (shop_id, user_id),
    CONSTRAINT shop_loyalty_balance_non_negative CHECK (points_balance >= 0)
);

-- ─── Append-only ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_loyalty_transactions (
    id             TEXT PRIMARY KEY,
    account_id     TEXT NOT NULL REFERENCES shop_loyalty_accounts(id) ON DELETE CASCADE,
    shop_id        TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points         INTEGER NOT NULL,
    kind           TEXT NOT NULL,
    order_id       TEXT REFERENCES orders(id) ON DELETE SET NULL,
    description    TEXT,
    expires_at     TEXT,
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
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
