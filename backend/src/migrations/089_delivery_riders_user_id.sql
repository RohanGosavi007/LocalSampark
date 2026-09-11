-- Link delivery_riders to the user account that acts as that rider.
--
-- delivery_riders.id is a 'RIDER-<hex>' value minted by registerRider, which is
-- a different id space from users.id. There was therefore no way to check that
-- the caller of PUT /logistics/riders/:id/status or
-- POST /logistics/riders/:id/location is the rider being modified — the routes
-- were unauthenticated, and simply adding authenticate() left every signed-in
-- user able to act on every rider.
--
-- Backfill matches on the last ten digits of the phone number, because
-- delivery_riders.phone is stored as entered ('9876543210') while
-- users.phone_number carries a country code ('+919876543210'). Rows that do not
-- match are left NULL; rider.controller.js refuses to act on an unlinked rider
-- rather than falling open.

BEGIN;

ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_riders_user_id ON delivery_riders(user_id);

UPDATE delivery_riders dr
SET user_id = u.id
FROM users u
WHERE dr.user_id IS NULL
  AND RIGHT(REGEXP_REPLACE(u.phone_number, '\D', '', 'g'), 10)
    = RIGHT(REGEXP_REPLACE(dr.phone, '\D', '', 'g'), 10)
  AND LENGTH(REGEXP_REPLACE(dr.phone, '\D', '', 'g')) >= 10;

COMMIT;
