-- Migration 086: the last columns the application queries but never had
--
-- As in 085, anything the schema already expressed under another name was fixed
-- in the code instead: society_messages stores its body in `message`,
-- revenue_transactions classifies with `source_type`, and franchise_partners
-- records its area in `territory_pincode`. Only genuinely absent columns are
-- added here.
--
-- marketplace_chat_messages is the notable one. marketplaceSocket.js inserts a
-- listing_id, the table is keyed by chat_id, and the insert ends in
-- .catch(() => {}) -- so every marketplace chat message was thrown away without
-- a trace. The listing is what the socket actually knows, so it is stored.

ALTER TABLE marketplace_chat_messages ADD COLUMN IF NOT EXISTS listing_id TEXT REFERENCES marketplace_listings(id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_listing
    ON marketplace_chat_messages(listing_id, created_at);

-- shop-management.controller.js stores a weekly availability grid as JSON
-- ({ day, slots: [{start, end}] }); `shift` is a plain label and cannot hold it.
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS availability TEXT;

-- events.routes.js lists local events by lifecycle state ('upcoming'), which
-- is_active cannot express.
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
CREATE INDEX IF NOT EXISTS idx_local_events_status ON local_events(status, event_date);

-- advanced.routes.js attaches parsed skills to the resume they came from.
ALTER TABLE job_skills ADD COLUMN IF NOT EXISTS resume_id TEXT;
CREATE INDEX IF NOT EXISTS idx_job_skills_resume ON job_skills(resume_id);

-- shop-management.controller.js orders line items by when they were added.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
