-- ─────────────────────────────────────────────────────────────────────────────
-- 121: a referral code is claimed once per account
--
-- POST /engagement/referral/claim pays coins to both parties. It checked for an
-- earlier claim with a SELECT and then inserted, so two requests sent together
-- both passed the check and both paid. The rule belongs in the table: one row
-- per referee.
--
-- The index is created only if the data already satisfies it. A database that
-- has double claims in it keeps running; the notice says what to clean up, and
-- the route's own check still applies in the meantime.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM referrals WHERE referee_id IS NOT NULL GROUP BY referee_id HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'referrals has accounts that claimed more than once; idx_referrals_one_claim_per_referee was not created. Remove the duplicates and re-run.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_one_claim_per_referee
      ON referrals (referee_id) WHERE referee_id IS NOT NULL;
  END IF;
END $$;
