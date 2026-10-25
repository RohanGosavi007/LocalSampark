-- ─────────────────────────────────────────────────────────────────────────────
-- 124: who has joined a group-buying deal
--
-- Joining a deal incremented group_buying_deals.current_buyers and recorded
-- nothing else, so one account could join a deal as many times as it liked and
-- unlock the group price on its own. A participant row per account — unique per
-- deal — is what is counted now.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS group_buying_participants (
    id         TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    deal_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    joined_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_buy_one_join ON group_buying_participants (deal_id, user_id);

COMMIT;
