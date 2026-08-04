-- ═══════════════════════════════════════════════════════════════════════
-- Migration 033: Admin Territory Assignments (RBAC Hard Partitioning)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_territory_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    territory_id TEXT REFERENCES territories(id) ON DELETE CASCADE,
    district_id TEXT REFERENCES location_districts(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'territory_franchise',
    assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_assign_user ON admin_territory_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_assign_territory ON admin_territory_assignments(territory_id);
CREATE INDEX IF NOT EXISTS idx_admin_assign_district ON admin_territory_assignments(district_id);
CREATE INDEX IF NOT EXISTS idx_admin_assign_active ON admin_territory_assignments(is_active);
