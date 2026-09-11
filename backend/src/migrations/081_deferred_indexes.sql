-- Migration 081: indexes whose columns did not exist when they ran
--
-- Each of these CREATE INDEX statements lives in an earlier migration, next to
-- the table it belongs to. The columns they index are added later -- by 078 and
-- 079, which repair definitions that never executed -- so at the moment the
-- original statement ran the column was absent and the index was silently
-- skipped. The tables ended up correct and the indexes did not exist anywhere.
--
-- Re-created here, at the end, once every column is present. Each is
-- IF NOT EXISTS, so on a database where the original statement did succeed this
-- is a no-op.

CREATE INDEX IF NOT EXISTS idx_doctors_geohash
    ON medical_doctors(geohash);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_geo
    ON marketplace_listings(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_file_uploads_module
    ON file_uploads(module, entity_id);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user
    ON file_uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_hsb_customer
    ON home_service_bookings(customer_id, status);
