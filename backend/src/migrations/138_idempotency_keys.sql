-- ─────────────────────────────────────────────────────────────────────────────
-- 138: Idempotency-Key ledger for placing orders (C8)
--
-- A retried or double-submitted checkout placed a second order. The answer
-- given to each (customer, route, key) is kept for 24 hours and replayed to a
-- retry (middleware/idempotency.middleware.js). Times are written by the
-- application as ISO text on both engines.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    route TEXT NOT NULL,
    idem_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    response_status INTEGER,
    response_body TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_keys_user_route_key ON idempotency_keys(user_id, route, idem_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at);
