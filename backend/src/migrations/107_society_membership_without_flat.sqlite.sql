-- SQLite variant of 107_society_membership_without_flat.sql. See that file for
-- why a society member need not have a flat.
--
-- SQLite cannot drop a NOT NULL constraint in place, so the table is rebuilt:
-- create the new shape, copy the rows, swap the names. Wrapped in the runner's
-- own transaction, so a failure part-way leaves the original table untouched.
--
-- PRAGMA foreign_keys is deliberately not toggled here: the runner executes
-- statements individually and a stray ON/OFF would outlive this migration.
-- The child references are re-created with the table.

CREATE TABLE IF NOT EXISTS society_members_rebuilt (
    id TEXT PRIMARY KEY,
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    flat_number TEXT,
    role TEXT DEFAULT 'resident',
    is_active INTEGER DEFAULT 1,
    added_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    show_phone INTEGER DEFAULT 1,
    show_email INTEGER DEFAULT 1,
    profession TEXT,
    skills TEXT,
    bio TEXT,
    occupancy_type TEXT,
    member_since DATETIME,
    status TEXT,
    UNIQUE(society_id, user_id)
);

INSERT OR IGNORE INTO society_members_rebuilt
    (id, society_id, user_id, flat_number, role, is_active, added_by, created_at,
     show_phone, show_email, profession, skills, bio, occupancy_type, member_since, status)
SELECT id, society_id, user_id, flat_number, role, is_active, added_by, created_at,
       show_phone, show_email, profession, skills, bio, occupancy_type, member_since, status
  FROM society_members;

DROP TABLE society_members;

ALTER TABLE society_members_rebuilt RENAME TO society_members;

CREATE INDEX IF NOT EXISTS idx_society_members_role
    ON society_members(society_id, role) WHERE is_active = 1;
