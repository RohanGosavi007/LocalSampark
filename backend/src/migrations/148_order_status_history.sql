-- ─────────────────────────────────────────────────────────────────────────────
-- 148: an append-only history of every order's status (P1)
--
-- The admin order timeline was synthesised from the order row ("Current status:
-- …"): it could say where an order is, not how it got there, who moved it, or
-- when. Every status change is now recorded by the database itself, so no code
-- path (the shop, the rider, an admin, a job, an old route) can move an order
-- without leaving a row.
--
--   order_status_history   one row per change; UPDATE and DELETE are refused.
--   orders.status_changed_* a one-shot channel: a writer sets who is making the
--                           change and why in the same UPDATE as order_status;
--                           the trigger copies them into the history row and
--                           clears them, so a later change can never inherit a
--                           previous change's actor. A writer that sets nothing
--                           is recorded with no actor ("system").
--
-- order_id carries no foreign key on purpose: the history must not block, or be
-- removed by, the deletion of an order. It holds ids and status names only, no
-- personal details. Additive only: nothing is dropped or rewritten.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_user_id TEXT,
    actor_role TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history (order_id, id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_changed_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_changed_role TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_change_reason TEXT;

CREATE OR REPLACE FUNCTION order_status_history_refuse_change() RETURNS trigger AS $fn$
BEGIN
  RAISE EXCEPTION 'order_status_history is append-only';
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_status_history_append_only ON order_status_history;
CREATE TRIGGER order_status_history_append_only
BEFORE UPDATE OR DELETE ON order_status_history
FOR EACH ROW EXECUTE FUNCTION order_status_history_refuse_change();

CREATE OR REPLACE FUNCTION orders_record_status() RETURNS trigger AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, actor_user_id, actor_role)
    VALUES (NEW.id::text, NULL, COALESCE(NEW.order_status, 'pending'), NEW.user_id::text, 'customer');
    RETURN NEW;
  END IF;

  IF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, actor_user_id, actor_role, reason)
    VALUES (NEW.id::text, OLD.order_status, COALESCE(NEW.order_status, 'pending'),
            NEW.status_changed_by, COALESCE(NEW.status_changed_role, 'system'), NEW.status_change_reason);
    NEW.status_changed_by := NULL;
    NEW.status_changed_role := NULL;
    NEW.status_change_reason := NULL;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_record_status_insert ON orders;
CREATE TRIGGER orders_record_status_insert
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION orders_record_status();

DROP TRIGGER IF EXISTS orders_record_status_update ON orders;
CREATE TRIGGER orders_record_status_update
BEFORE UPDATE OF order_status ON orders
FOR EACH ROW EXECUTE FUNCTION orders_record_status();
