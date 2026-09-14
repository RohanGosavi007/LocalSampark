-- There is no `products` table in this schema; the catalogue is shop_products
-- and its id is a TEXT uuid, as is users.id. The original definition declared
-- INTEGER columns and a foreign key to products(id), which left a dangling
-- reference: SQLite accepts the CREATE but then fails every statement that
-- triggers a foreign-key check on this table, including `DELETE FROM users`.
-- init.sql was already corrected for Postgres; this keeps the SQLite path
-- (local dev and the USE_SQLITE CI job) in parity with it.
CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    session_id TEXT NULL,
    user_id TEXT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',
    total_amount REAL NOT NULL,
    delivery_fee REAL DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    delivery_lat REAL NULL,
    delivery_lng REAL NULL,
    payment_method TEXT DEFAULT 'COD',
    payment_status TEXT DEFAULT 'PENDING',
    payment_id TEXT NULL,
    fulfillment_method TEXT DEFAULT 'DELIVERY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (shop_id) REFERENCES local_shops(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_buy REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS order_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    runner_id INTEGER NULL,
    current_lat REAL NULL,
    current_lng REAL NULL,
    estimated_arrival DATETIME NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
