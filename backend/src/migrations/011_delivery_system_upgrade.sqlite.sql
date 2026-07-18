-- ─── DELIVERY WALLET LEDGER ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_wallets (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES delivery_agents(id) ON DELETE CASCADE UNIQUE,
    balance REAL NOT NULL DEFAULT 0.00,
    total_earned REAL NOT NULL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT REFERENCES delivery_wallets(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- 'credit', 'debit'
    purpose TEXT NOT NULL, -- 'order_payout', 'incentive', 'withdrawal', 'penalty'
    reference_id TEXT, -- e.g., order_id
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DRIVER KYC ONBOARDING ──────────────────────────────────────
-- Add columns to delivery_agents table if they don't exist
ALTER TABLE delivery_agents ADD COLUMN aadhar_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN dl_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN rc_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN profile_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN dl_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN rc_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN kyc_status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'rejected'
ALTER TABLE delivery_agents ADD COLUMN full_name TEXT;

-- ─── DELIVERY ANALYTICS (Daily/Weekly/Monthly) ──────────────────
CREATE TABLE IF NOT EXISTS delivery_analytics (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES delivery_agents(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TEXT NOT NULL, -- ISO Date string '2026-07-04'
    period_end TEXT NOT NULL,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings REAL DEFAULT 0.00,
    online_hours REAL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, period_type, period_start)
);
