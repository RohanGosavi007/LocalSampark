-- Phase 2 Nearby Shops Upgrade Migration

-- 1. Batch Orders (For Multi-Shop Carts)
CREATE TABLE IF NOT EXISTS batch_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    total_batch_amount REAL NOT NULL DEFAULT 0.00,
    combined_delivery_fee REAL NOT NULL DEFAULT 0.00,
    delivery_partner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Modify Orders table (SQLite requires adding column if not exists, but we can just use ALTER TABLE)
-- Since SQLite ALTER TABLE ADD COLUMN IF NOT EXISTS is not standard until newer versions, we will try standard ALTER TABLE.
-- If it fails because column exists, it's fine.
ALTER TABLE orders ADD COLUMN batch_id TEXT REFERENCES batch_orders(id) ON DELETE SET NULL;

-- 2. Loyalty Coins
CREATE TABLE IF NOT EXISTS loyalty_accounts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sampark_coins_balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned' or 'burned'
    reference_id TEXT, -- e.g., order_id
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Shop Stories/Highlights
ALTER TABLE stories ADD COLUMN shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE;

-- 4. Shop QA & Society Verified Reviews
ALTER TABLE shop_reviews ADD COLUMN is_society_verified INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS shop_qa (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    answered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Flash Sales
CREATE TABLE IF NOT EXISTS flash_sales (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES shop_products(id) ON DELETE CASCADE,
    discount_percentage REAL NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
