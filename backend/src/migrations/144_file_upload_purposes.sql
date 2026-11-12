-- ─────────────────────────────────────────────────────────────────────────────
-- 144: every upload purpose the upload service offers is one the table accepts
--
-- file_uploads.purpose had a CHECK listing nine purposes. The upload service
-- (modules/core/services/upload.service.js) offers thirteen: voice_intro,
-- video and story were refused by the database after the file had been
-- accepted, and return_photo (C10) was too. The constraint now lists them all.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE file_uploads DROP CONSTRAINT IF EXISTS file_uploads_purpose_check;
ALTER TABLE file_uploads ADD CONSTRAINT file_uploads_purpose_check
    CHECK (purpose IN ('general', 'product_image', 'shop_photo', 'profile_photo', 'review_photo', 'return_photo', 'job_card_photo', 'chat_image', 'prescription', 'document', 'voice_intro', 'video', 'story'));
