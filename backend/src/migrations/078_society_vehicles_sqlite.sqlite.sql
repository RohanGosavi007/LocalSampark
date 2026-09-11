-- Migration 078 (SQLite): declare society_vehicles
--
-- init.sql declares this table for PostgreSQL, but nothing ever declared it for
-- SQLite. Migration 034 only assumed it -- its own comment reads "Assuming
-- society_vehicles exists" -- and then tried to ALTER it, which failed on every
-- run. The gate lookup in guard-operations.controller.js queries it directly, so
-- vehicle checks at the gate have never worked on a SQLite deployment.
--
-- This mirrors the PostgreSQL definition, with the two columns migration 034
-- meant to add folded in, since 034 runs earlier and cannot alter a table that
-- does not exist yet.

CREATE TABLE IF NOT EXISTS society_vehicles (
    id                 TEXT PRIMARY KEY,
    society_id         TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    resident_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
    flat_number        TEXT NOT NULL,
    vehicle_number     TEXT NOT NULL,
    vehicle_type       TEXT,
    make_model         TEXT,
    colour             TEXT,
    parking_slot       TEXT,
    vehicle_photo_url  TEXT,
    is_active          INTEGER NOT NULL DEFAULT 1,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (society_id, vehicle_number)
);

CREATE INDEX IF NOT EXISTS idx_society_vehicles_lookup
    ON society_vehicles (society_id, vehicle_number);
