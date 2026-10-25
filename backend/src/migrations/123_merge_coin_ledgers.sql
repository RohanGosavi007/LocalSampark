-- ─────────────────────────────────────────────────────────────────────────────
-- 123: one SamparkCoins balance
--
-- Coins lived in three places (see services/coins.service.js):
--   loyalty_accounts      the balance the apps show and checkout spends
--   reward_coins_ledger   referral, scrap-donation, volunteering and blood-donor
--                         rewards — never added to that balance
--   loyalty_wallets       spent by the community features, credited by nothing
--
-- From now on everything reads and writes loyalty_accounts and
-- loyalty_transactions. This carries each user's coins from the other two
-- tables across, once: a loyalty_transactions row with reference_id
-- 'merge:<table>' records that a user's coins from that table have been moved,
-- and a user who already has one is skipped.
--
-- The old tables are left in place, untouched, as the record of what was moved.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- reward_coins_ledger ─────────────────────────────────────────────────────────
INSERT INTO loyalty_accounts (user_id, sampark_coins_balance)
SELECT DISTINCT r.user_id, 0
  FROM reward_coins_ledger r
 WHERE r.amount > 0
ON CONFLICT (user_id) DO NOTHING;

UPDATE loyalty_accounts a
   SET sampark_coins_balance = COALESCE(a.sampark_coins_balance, 0)
       + (SELECT COALESCE(SUM(r.amount), 0) FROM reward_coins_ledger r WHERE r.user_id = a.user_id AND r.amount > 0)
 WHERE EXISTS (SELECT 1 FROM reward_coins_ledger r WHERE r.user_id = a.user_id AND r.amount > 0)
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = a.user_id AND t.reference_id = 'merge:reward_coins_ledger');

INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
SELECT uuid_generate_v4()::text, r.user_id, SUM(r.amount), 'earned', 'merge:reward_coins_ledger',
       'Rewards carried over from the earlier rewards ledger'
  FROM reward_coins_ledger r
 WHERE r.amount > 0
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = r.user_id AND t.reference_id = 'merge:reward_coins_ledger')
 GROUP BY r.user_id;

-- loyalty_wallets ─────────────────────────────────────────────────────────────
INSERT INTO loyalty_accounts (user_id, sampark_coins_balance)
SELECT w.user_id, 0
  FROM loyalty_wallets w
 WHERE w.user_id IS NOT NULL AND w.total_coins > 0
ON CONFLICT (user_id) DO NOTHING;

UPDATE loyalty_accounts a
   SET sampark_coins_balance = COALESCE(a.sampark_coins_balance, 0)
       + (SELECT COALESCE(SUM(w.total_coins), 0) FROM loyalty_wallets w WHERE w.user_id = a.user_id AND w.total_coins > 0)
 WHERE EXISTS (SELECT 1 FROM loyalty_wallets w WHERE w.user_id = a.user_id AND w.total_coins > 0)
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = a.user_id AND t.reference_id = 'merge:loyalty_wallets');

INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
SELECT uuid_generate_v4()::text, w.user_id, SUM(w.total_coins), 'earned', 'merge:loyalty_wallets',
       'Coins carried over from the earlier community wallet'
  FROM loyalty_wallets w
 WHERE w.user_id IS NOT NULL AND w.total_coins > 0
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = w.user_id AND t.reference_id = 'merge:loyalty_wallets')
 GROUP BY w.user_id;

-- One Fortune Wheel spin per user per day, enforced by the database: the
-- check in the handler was a read followed by a write, which two requests sent
-- together could both pass.
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_one_spin_per_day
    ON loyalty_transactions (user_id, reference_id)
 WHERE description = 'Fortune Wheel' AND reference_id IS NOT NULL;

COMMIT;
