-- Migration 077: admin audit actor name, and a declared roles-config table
--
-- Two problems surfaced together in admin-godmode.controller.js.
--
-- First, three endpoints wrote to `admin_audit_logs` -- plural -- which has
-- never existed in either engine. The write was wrapped in a try/catch that
-- called next(e), so the error handler responded and then the handler fell
-- through to res.json: a double response on every call. The table name is fixed
-- in the controller; the actor name it records needs a column, and denormalising
-- it is deliberate, since an audit trail should still name who acted after the
-- user row is renamed or removed.
--
-- Second, admin_roles_config existed only because admin-roles.controller.js
-- creates it lazily at runtime on first use. Anything that read it before that
-- controller was ever called found no table. It is declared here so a migrated
-- database has it from the start.

ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS admin_name TEXT;

CREATE TABLE IF NOT EXISTS admin_roles_config (
    id          VARCHAR(255) PRIMARY KEY,
    role_name   VARCHAR(100) UNIQUE,
    description TEXT,
    permissions TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
