-- ─────────────────────────────────────────────────────────────────────────────
-- 108: Idempotent gate entries
--
-- A guard's post is a gate — a concrete box at the edge of a compound, usually
-- in a basement or against a boundary wall, which is where mobile signal is
-- worst. The console now queues entries locally and drains them when the link
-- returns, which means the same entry can be uploaded more than once: the first
-- attempt may have reached the server and had its response lost on the way
-- back.
--
-- Without a key the device controls, that retry creates a second visitor. A
-- duplicate gate entry is not a cosmetic problem: it is a visitor who appears
-- never to have left, because the check-out matches one row and leaves the
-- other open forever.
--
-- client_entry_id is generated on the device and unique within a society. A
-- replay collides and is recognised instead of inserted.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS client_entry_id VARCHAR(64);

-- Scoped to the society: two societies' gate tablets can generate the same id
-- without colliding, and a guard moving between societies carries no baggage.
CREATE UNIQUE INDEX IF NOT EXISTS idx_society_visitor_client_entry
    ON society_visitors (society_id, client_entry_id)
    WHERE client_entry_id IS NOT NULL;
