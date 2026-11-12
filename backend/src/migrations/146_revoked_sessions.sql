-- ─────────────────────────────────────────────────────────────────────────────
-- 146: signing out one device (C1)
--
-- Logging out bumped users.token_version, which signs the account out on
-- every device: there was no way to sign out of just this one. Each session's
-- tokens now carry a session id (sid); signing out records it here and its
-- tokens stop working. "Sign out everywhere" still bumps token_version.
-- expires_at is when the session's refresh token would have expired anyway,
-- after which the row is no longer needed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revoked_sessions (
    sid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    revoked_at TEXT NOT NULL,
    expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_revoked_sessions_user ON revoked_sessions(user_id);
