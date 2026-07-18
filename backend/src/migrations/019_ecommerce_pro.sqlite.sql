-- E-Commerce Advanced Capabilities

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    variant_name TEXT NOT NULL, -- e.g., "Color", "Size"
    variant_value TEXT NOT NULL, -- e.g., "Red", "XL"
    sku TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0.00,
    inventory_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES shop_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    address_type TEXT NOT NULL DEFAULT 'home', -- e.g. 'home', 'work', 'other'
    full_name TEXT,
    phone_number TEXT,
    street_address TEXT NOT NULL,
    apartment_suite TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add advanced ecommerce fields to shop_products
-- (Note: SQLite ALTER TABLE ADD COLUMN does not support constraints or defaults in one step nicely for all types, but basic columns work)
ALTER TABLE shop_products ADD COLUMN inventory_count INTEGER DEFAULT 0;
ALTER TABLE shop_products ADD COLUMN sku TEXT;
ALTER TABLE shop_products ADD COLUMN track_inventory INTEGER DEFAULT 1;
ALTER TABLE shop_products ADD COLUMN category_id TEXT;
