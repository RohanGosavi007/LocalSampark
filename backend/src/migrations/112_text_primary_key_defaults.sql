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
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.table_constraints tc
        ON tc.table_schema = c.table_schema
       AND tc.table_name = c.table_name
       AND tc.constraint_type = 'PRIMARY KEY'
      JOIN information_schema.key_column_usage k
        ON k.constraint_schema = tc.constraint_schema
       AND k.constraint_name = tc.constraint_name
       AND k.column_name = c.column_name
     WHERE c.table_schema = 'public'
       AND c.column_name = 'id'
       AND c.data_type IN ('text', 'character varying')
       AND c.column_default IS NULL
       -- single-column keys only: a composite key that happens to include a
       -- column called id is not an id in this sense
       AND (SELECT COUNT(*)
              FROM information_schema.key_column_usage k2
             WHERE k2.constraint_schema = tc.constraint_schema
               AND k2.constraint_name = tc.constraint_name) = 1
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text', target.table_name);
    RAISE NOTICE '112: default id set on %', target.table_name;
  END LOOP;
END $$;
