-- ─────────────────────────────────────────────────────────────────────────────
-- 107: A society member need not have a flat
--
-- society_members.flat_number was NOT NULL, which quietly made the table unable
-- to represent the people the society module exists to serve alongside
-- residents: a security guard has no flat, and neither does a contracted
-- housekeeping supervisor or a managing-committee member who lives elsewhere.
--
-- The consequence was not an error anyone saw. It was that guards were never
-- recorded as society members at all, so the only place their society
-- affiliation could live was users.role — a single global string, which cannot
-- express "guard at Green Acres and an ordinary customer everywhere else".
-- That is the root of the role-parity problem: the composable model existed in
-- the schema and the schema forbade using it for exactly the role that needed
-- it most.
--
-- Residents still have flats. Nothing about this weakens that; a NULL here
-- means "not attached to a flat", which for a guard is the truth.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE society_members ALTER COLUMN flat_number DROP NOT NULL;

-- Non-flat members are looked up by role within a society (the gate roster, the
-- committee list), which is a different access path from the resident lookup.
CREATE INDEX IF NOT EXISTS idx_society_members_role
    ON society_members(society_id, role) WHERE is_active = 1;
