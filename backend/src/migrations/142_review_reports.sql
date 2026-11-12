-- ─────────────────────────────────────────────────────────────────────────────
-- 142: reports of abusive reviews, and the moderation decision on each (C11)
--
-- shop_reviews.is_flagged existed with nothing to set it and no queue behind
-- it. A customer reports a review (one open report per person per review);
-- an admin hides it or keeps it, and the reports are closed with who decided,
-- when and why (services/reviews.service.js).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_reports (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    resolution_note TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON review_reports(review_id, status);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status, created_at);
