-- Repair cart_items on databases created before 018 was corrected.
--
-- The old definition was:
--   user_id    INTEGER  REFERENCES users(id)
--   product_id INTEGER  REFERENCES products(id)
--
-- `products` does not exist in this schema (the catalogue is shop_products),
-- and both parent keys are TEXT uuids, not integers. SQLite allows a table to
-- be created against a missing parent table, then raises
-- "no such table: main.products" on any statement that triggers a foreign-key
-- check against it — which made `DELETE FROM users` fail outright, breaking
-- account deletion and the selective data purge.
--
-- SQLite cannot ALTER a constraint, so the table is rebuilt. Existing rows are
-- copied across; cart contents are transient by nature and any row whose
-- product_id no longer resolves is dropped rather than carried into a table
-- that now enforces the reference.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS cart_items_fixed (
    id TEXT PRIMARY KEY,
    session_id TEXT NULL,
    user_id TEXT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    custom_options TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO cart_items_fixed
    (id, session_id, user_id, product_id, quantity, custom_options, created_at, updated_at)
SELECT
    CAST(c.id AS TEXT),
    c.session_id,
    CAST(c.user_id AS TEXT),
    CAST(c.product_id AS TEXT),
    c.quantity,
    c.custom_options,
    c.created_at,
    c.updated_at
FROM cart_items c
WHERE EXISTS (SELECT 1 FROM shop_products p WHERE p.id = CAST(c.product_id AS TEXT));

DROP TABLE cart_items;

ALTER TABLE cart_items_fixed RENAME TO cart_items;

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

PRAGMA foreign_keys = ON;
