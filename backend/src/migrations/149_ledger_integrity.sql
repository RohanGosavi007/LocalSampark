-- ─────────────────────────────────────────────────────────────────────────────
-- 149: the ledger's integrity (P3)
--
-- platform_ledger_entries is the platform's book of record: "immutable
-- double-entry records for every money movement". Nothing enforced that.
--
--   * Entries could be UPDATEd and DELETEd by anyone with database access, or by
--     a bug, and the balances would silently change. They are now append-only:
--     a correction is a new, opposite entry, never an edit.
--   * Posting the same event twice (a retried request, a job run twice)
--     double-counted it. platform_ledger_postings holds one row per posting key
--     ("ORDER_PAYMENT:<order id>"), inserted in the same transaction as the
--     entries; a second attempt violates its primary key and is recognised as a
--     repeat.
--
-- Additive only: no existing row is changed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_ledger_postings (
    posting_key    TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION platform_ledger_refuse_change() RETURNS trigger AS $fn$
BEGIN
  RAISE EXCEPTION 'platform_ledger_entries is append-only: post a correcting entry instead';
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_ledger_entries_append_only ON platform_ledger_entries;
CREATE TRIGGER platform_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON platform_ledger_entries
FOR EACH ROW EXECUTE FUNCTION platform_ledger_refuse_change();
