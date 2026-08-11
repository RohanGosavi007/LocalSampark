-- 045_universal_ecommerce_catalog.sqlite.sql

-- Universal Catalog Items for Polymorphic Ecommerce
CREATE TABLE IF NOT EXISTS universal_catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'physical_good', -- physical_good, service, subscription, job_card
    title TEXT NOT NULL,
    description TEXT,
    pricing_model TEXT NOT NULL DEFAULT 'fixed', -- fixed, hourly, variable
    price REAL NOT NULL,
    compare_at_price REAL,
    inventory_count INTEGER DEFAULT 0,
    availability_matrix TEXT, -- JSON string for service slots
    image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Universal Orders to unify all 66 categories
CREATE TABLE IF NOT EXISTS universal_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount REAL NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'retail', -- retail, booking, job_card
    scheduled_time DATETIME, -- for bookings
    delivery_address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Universal Order Items
CREATE TABLE IF NOT EXISTS universal_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time REAL NOT NULL,
    meta_data TEXT, -- JSON for custom variations/slots selected
    FOREIGN KEY (order_id) REFERENCES universal_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES universal_catalog_items(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_univ_catalog_shop ON universal_catalog_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_univ_orders_shop ON universal_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_univ_orders_user ON universal_orders(user_id);
