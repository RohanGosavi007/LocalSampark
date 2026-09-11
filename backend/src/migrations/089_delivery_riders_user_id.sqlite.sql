-- SQLite variant of 080_delivery_riders_user_id.sql. See that file for why.
--
-- Differences from the Postgres version:
--   * users.id is TEXT here, not UUID.
--   * SQLite has no ADD COLUMN IF NOT EXISTS; the runner already swallows the
--     "duplicate column name" error on a re-run, which is how every other
--     migration in this directory handles it.
--   * No REGEXP_REPLACE. replace() strips the characters that actually occur in
--     these numbers ('+', space, '-') and substr(..., -10) takes the last ten
--     digits, which is the part that identifies the subscriber.

ALTER TABLE delivery_riders ADD COLUMN user_id TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_delivery_riders_user_id ON delivery_riders(user_id);

UPDATE delivery_riders
SET user_id = (
  SELECT u.id
  FROM users u
  WHERE substr(replace(replace(replace(u.phone_number, '+', ''), ' ', ''), '-', ''), -10)
      = substr(replace(replace(replace(delivery_riders.phone, '+', ''), ' ', ''), '-', ''), -10)
  LIMIT 1
)
WHERE user_id IS NULL
  AND length(replace(replace(replace(phone, '+', ''), ' ', ''), '-', '')) >= 10;
