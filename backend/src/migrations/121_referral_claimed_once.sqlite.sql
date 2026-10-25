-- 121 (SQLite): a referral code is claimed once per account.
-- The reasoning is in 121_referral_claimed_once.sql. If the table already holds
-- double claims this statement fails; the runner reports it as a warning and
-- carries on, and the route's own check still applies.

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_one_claim_per_referee
    ON referrals (referee_id) WHERE referee_id IS NOT NULL;
