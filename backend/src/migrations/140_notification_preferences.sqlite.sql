-- ─────────────────────────────────────────────────────────────────────────────
-- 140: what notifications reach a customer, and how (C13) — SQLite twin of
-- 140_notification_preferences.sql (identical).
--
-- One row per user who has changed a setting; no row means every setting is
-- on. 1 = on, 0 = off, as INTEGER on both engines. Order updates are always
-- kept in the inbox; order_updates = 0 stops their push and email.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY,
    order_updates INTEGER NOT NULL DEFAULT 1,
    promotions INTEGER NOT NULL DEFAULT 1,
    push_enabled INTEGER NOT NULL DEFAULT 1,
    email_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT
);
