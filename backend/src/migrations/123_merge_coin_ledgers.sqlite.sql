-- 123 (SQLite): one SamparkCoins balance. The reasoning is in
-- 123_merge_coin_ledgers.sql. The SQLite runner re-runs every file on every
-- start, so each step is guarded by the 'merge:<table>' marker row and the
-- whole carry-over is one transaction.

BEGIN;

INSERT INTO loyalty_accounts (user_id, sampark_coins_balance)
SELECT DISTINCT CAST(r.user_id AS TEXT), 0
  FROM reward_coins_ledger r
 WHERE r.amount > 0
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = CAST(r.user_id AS TEXT) AND t.reference_id = 'merge:reward_coins_ledger')
ON CONFLICT (user_id) DO NOTHING;

UPDATE loyalty_accounts
   SET sampark_coins_balance = COALESCE(sampark_coins_balance, 0)
       + (SELECT COALESCE(SUM(r.amount), 0) FROM reward_coins_ledger r WHERE CAST(r.user_id AS TEXT) = loyalty_accounts.user_id AND r.amount > 0)
 WHERE EXISTS (SELECT 1 FROM reward_coins_ledger r WHERE CAST(r.user_id AS TEXT) = loyalty_accounts.user_id AND r.amount > 0)
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = loyalty_accounts.user_id AND t.reference_id = 'merge:reward_coins_ledger');

INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
SELECT lower(hex(randomblob(16))), CAST(r.user_id AS TEXT), SUM(r.amount), 'earned', 'merge:reward_coins_ledger',
       'Rewards carried over from the earlier rewards ledger'
  FROM reward_coins_ledger r
 WHERE r.amount > 0
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = CAST(r.user_id AS TEXT) AND t.reference_id = 'merge:reward_coins_ledger')
 GROUP BY r.user_id;

INSERT INTO loyalty_accounts (user_id, sampark_coins_balance)
SELECT CAST(w.user_id AS TEXT), 0
  FROM loyalty_wallets w
 WHERE w.user_id IS NOT NULL AND w.total_coins > 0
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = CAST(w.user_id AS TEXT) AND t.reference_id = 'merge:loyalty_wallets')
ON CONFLICT (user_id) DO NOTHING;

UPDATE loyalty_accounts
   SET sampark_coins_balance = COALESCE(sampark_coins_balance, 0)
       + (SELECT COALESCE(SUM(w.total_coins), 0) FROM loyalty_wallets w WHERE CAST(w.user_id AS TEXT) = loyalty_accounts.user_id AND w.total_coins > 0)
 WHERE EXISTS (SELECT 1 FROM loyalty_wallets w WHERE CAST(w.user_id AS TEXT) = loyalty_accounts.user_id AND w.total_coins > 0)
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = loyalty_accounts.user_id AND t.reference_id = 'merge:loyalty_wallets');

INSERT INTO loyalty_transactions (id, user_id, amount, transaction_type, reference_id, description)
SELECT lower(hex(randomblob(16))), CAST(w.user_id AS TEXT), SUM(w.total_coins), 'earned', 'merge:loyalty_wallets',
       'Coins carried over from the earlier community wallet'
  FROM loyalty_wallets w
 WHERE w.user_id IS NOT NULL AND w.total_coins > 0
   AND NOT EXISTS (SELECT 1 FROM loyalty_transactions t WHERE t.user_id = CAST(w.user_id AS TEXT) AND t.reference_id = 'merge:loyalty_wallets')
 GROUP BY w.user_id;

COMMIT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_one_spin_per_day
    ON loyalty_transactions (user_id, reference_id)
 WHERE description = 'Fortune Wheel' AND reference_id IS NOT NULL;
