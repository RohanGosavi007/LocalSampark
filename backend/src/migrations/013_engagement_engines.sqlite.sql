-- 013_engagement_engines.sqlite.sql

-- 1. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referee_id TEXT,
    referral_code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending', -- pending, completed
    reward_issued INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referee_id) REFERENCES users(id)
);

-- 2. Reward Coins Ledger
CREATE TABLE IF NOT EXISTS reward_coins_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL, -- Number of coins (100 coins = 10 rupees)
    transaction_type TEXT NOT NULL, -- 'earned_referral', 'spent_on_order', 'earned_cashback'
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ensure users have a total_coins column
-- ALTER TABLE users ADD COLUMN total_coins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN my_referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(my_referral_code);

-- 3. Reviews and Ratings
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_id TEXT NOT NULL, -- Can be shop_id, agent_id, or service_id
    target_type TEXT NOT NULL, -- 'shop', 'agent', 'service'
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
