-- Emergency SOS tables.
--
-- src/modules/core/controllers/sos.controller.js is mounted at /api/v1/sos and
-- every one of its handlers reads or writes sos_alerts or emergency_contacts.
-- Neither table was created by any migration. They exist only in the developer's
-- local SQLite file, created ad hoc at some point, so a fresh deployment — which
-- is to say production — answers 500 on every SOS call.
--
-- This is the emergency path: the mobile Medical screen raises a medical alert
-- through POST /sos/trigger, and the admin dashboard counts active alerts from
-- sos_alerts. It has to work on a database built from the migrations alone.
--
-- Columns are taken from the statements the controller actually runs.

BEGIN;

CREATE TABLE IF NOT EXISTS sos_alerts (
    id         TEXT PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- medical, safety, fire, accident — free text, set by the caller.
    type       TEXT,
    latitude   DOUBLE PRECISION,
    longitude  DOUBLE PRECISION,
    pincode    TEXT,
    -- active | resolved | false_alarm
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    -- addContact relies on ON CONFLICT DO NOTHING, which needs this pair to be
    -- the conflict target.
    PRIMARY KEY (user_id, contact_user_id)
);

-- The admin dashboard counts active alerts and lists them newest first.
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);

COMMIT;
