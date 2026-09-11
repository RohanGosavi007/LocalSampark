-- SQLite variant of 092_sos_alerts.sql. See that file for why these tables are
-- needed.
--
-- Differences: no explicit transaction (the runner executes statement by
-- statement); TIMESTAMPTZ becomes TEXT with a CURRENT_TIMESTAMP default;
-- DOUBLE PRECISION becomes REAL; and no DESC in index definitions, since SQLite
-- walks an index backwards just as well.
--
-- src/modules/core/controllers/sos.controller.js is mounted at /api/v1/sos and
-- every handler reads or writes one of these tables. Neither was created by any
-- migration, so a database built from the migrations alone answered 500 on every
-- SOS call — including the medical emergency alert raised from the mobile app.

CREATE TABLE IF NOT EXISTS sos_alerts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT,
    latitude   REAL,
    longitude  REAL,
    pincode    TEXT,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
