-- ─────────────────────────────────────────────────────────────────────────────
-- 112: generated ids for text primary keys that have no default
--
-- Twenty-five INSERT statements in the running application name no id and
-- write to a table whose primary key is `id TEXT PRIMARY KEY` with no default:
-- loyalty_transactions, lead_activities, shop_staff, job_skills, job_cards and
-- their milestones, parts and photos, trust_reviews, leads, shop_campaigns,
-- group_buying_deals, token_queue_visitors, lost_found_alerts and others.
--
-- On SQLite those statements work, because the driver adds a generated UUID
-- when an INSERT omits the id (config/database.sqlite.js#prepareInsert). On
-- PostgreSQL nothing does, so each fails with a null value in column "id" —
-- the code was written, and tested, against behaviour only one engine has.
--
-- A column default is the PostgreSQL way to say the same thing, and it is what
-- most tables here already carry. This gives it to the ones that were missed,
-- found by inspection of the catalog rather than by a list, so a table added
-- later with the same shape is covered when this is re-run by hand.
--
-- Only single-column primary keys named `id`, of a text type, with no default.
-- Idempotent: once a default is set the column no longer matches.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT r.relname AS table_name
      FROM pg_constraint con
      JOIN pg_class r ON r.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum = con.conkey[1]
      JOIN pg_type t ON t.oid = a.atttypid
     WHERE con.contype = 'p'
       AND n.nspname = 'public'
       AND array_length(con.conkey, 1) = 1
       AND a.attname = 'id'
       AND t.typname IN ('text', 'varchar')
       AND NOT a.atthasdef
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text', target.table_name);
    RAISE NOTICE '112: default id set on %', target.table_name;
  END LOOP;
END $$;
