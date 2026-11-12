-- ─────────────────────────────────────────────────────────────────────────────
-- 144: every upload purpose the upload service offers is one the table accepts
-- — SQLite twin of 144_file_upload_purposes.sql.
--
-- SQLite cannot change a CHECK constraint, so the table is rebuilt with every
-- column it has (016 plus 079's additions) and its indexes, and the rows are
-- copied across unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS file_uploads_v144 (
    id TEXT PRIMARY KEY,
    uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    purpose TEXT DEFAULT 'general' CHECK (purpose IN ('general', 'product_image', 'shop_photo', 'profile_photo', 'review_photo', 'return_photo', 'job_card_photo', 'chat_image', 'prescription', 'document', 'voice_intro', 'video', 'story')),
    reference_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    module TEXT,
    entity_id TEXT,
    mime_type TEXT,
    thumbnail_path TEXT,
    is_public INTEGER,
    uploaded_at DATETIME
);

INSERT OR IGNORE INTO file_uploads_v144
    (id, uploader_id, file_name, file_path, file_type, file_size, purpose, reference_id, created_at,
     user_id, module, entity_id, mime_type, thumbnail_path, is_public, uploaded_at)
SELECT id, uploader_id, file_name, file_path, file_type, file_size, purpose, reference_id, created_at,
       user_id, module, entity_id, mime_type, thumbnail_path, is_public, uploaded_at
  FROM file_uploads;

DROP TABLE file_uploads;

ALTER TABLE file_uploads_v144 RENAME TO file_uploads;

CREATE INDEX IF NOT EXISTS idx_uploads_uploader ON file_uploads (uploader_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_module ON file_uploads(module, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);

PRAGMA foreign_keys = ON;
