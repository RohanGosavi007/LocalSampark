-- 058: Correct order_tracking column types and drop the invalid indexes.
--
-- order_tracking declared order_id INTEGER with a foreign key to orders(id),
-- which is UUID, and runner_id INTEGER against delivery_riders(id), which is
-- TEXT. Neither constraint could be satisfied, so rider assignment and delivery
-- tracking could not write a row.
--
-- init.sql also carried 71 statements of the form
--   CREATE INDEX ... ON <table>(FOREIGN);
-- which index the bare SQL keyword FOREIGN. Each is a syntax error that aborts
-- a Postgres schema load, so they are removed there. Any that were somehow
-- created are dropped below.

BEGIN;

ALTER TABLE order_tracking DROP CONSTRAINT IF EXISTS order_tracking_order_id_fkey;

-- Existing rows cannot carry a meaningful order reference: the old integer ids
-- never matched a UUID order, so the columns are rebuilt rather than cast.
ALTER TABLE order_tracking ADD COLUMN IF NOT EXISTS order_id_uuid UUID;

UPDATE order_tracking
   SET order_id_uuid = o.id
  FROM orders o
 WHERE o.id::text = order_tracking.order_id::text;

ALTER TABLE order_tracking DROP COLUMN order_id;
ALTER TABLE order_tracking RENAME COLUMN order_id_uuid TO order_id;

DELETE FROM order_tracking WHERE order_id IS NULL;

ALTER TABLE order_tracking ALTER COLUMN order_id SET NOT NULL;
ALTER TABLE order_tracking ADD CONSTRAINT order_tracking_order_id_key UNIQUE (order_id);
ALTER TABLE order_tracking
  ADD CONSTRAINT order_tracking_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- delivery_riders.id is TEXT.
ALTER TABLE order_tracking ALTER COLUMN runner_id TYPE TEXT USING runner_id::text;

CREATE INDEX IF NOT EXISTS idx_order_tracking_runner ON order_tracking(runner_id);

COMMIT;
