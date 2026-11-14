-- ─────────────────────────────────────────────────────────────────────────────
-- 148: an append-only history of every order's status (P1) — SQLite twin of
-- 148_order_status_history.sql. See that file for the reasoning. A re-run
-- reports "duplicate column", which the SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_user_id TEXT,
    actor_role TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history (order_id, id);

ALTER TABLE orders ADD COLUMN status_changed_by TEXT;
ALTER TABLE orders ADD COLUMN status_changed_role TEXT;
ALTER TABLE orders ADD COLUMN status_change_reason TEXT;

CREATE TRIGGER IF NOT EXISTS order_status_history_no_update
BEFORE UPDATE ON order_status_history
BEGIN
  SELECT RAISE(ABORT, 'order_status_history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS order_status_history_no_delete
BEFORE DELETE ON order_status_history
BEGIN
  SELECT RAISE(ABORT, 'order_status_history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS orders_record_status_insert
AFTER INSERT ON orders
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, actor_user_id, actor_role)
  VALUES (NEW.id, NULL, COALESCE(NEW.order_status, 'pending'), NEW.user_id, 'customer');
END;

CREATE TRIGGER IF NOT EXISTS orders_record_status_update
AFTER UPDATE OF order_status ON orders
WHEN NEW.order_status IS NOT OLD.order_status
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, actor_user_id, actor_role, reason)
  VALUES (NEW.id, OLD.order_status, COALESCE(NEW.order_status, 'pending'),
          NEW.status_changed_by, COALESCE(NEW.status_changed_role, 'system'), NEW.status_change_reason);
  UPDATE orders SET status_changed_by = NULL, status_changed_role = NULL, status_change_reason = NULL
   WHERE id = NEW.id;
END;
