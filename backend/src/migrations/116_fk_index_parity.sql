-- ─────────────────────────────────────────────────────────────────────────────
-- 116: indexes and foreign keys only SQLite had
--
-- Found by comparing the migrated SQLite schema with a model of this migration
-- set (scripts/pg-schema-model.js). The SQLite half is 116_fk_index_parity.js.
--
-- INDEXES. Thirty-eight, nearly all from 064 and 065, the two SQLite migrations
-- that never had a PostgreSQL counterpart. They cover the lookups the carpool,
-- jobs, marketplace and cart screens make on every request — rides by driver
-- and date, applications by job, cart items by user. Without them those are
-- sequential scans; invisible on a pilot's data, not on a city's.
--
-- FOREIGN KEYS. Five that SQLite declares and PostgreSQL does not, where the
-- column types allow one. They are added NOT VALID: new and changed rows are
-- checked, existing rows are not, so this cannot fail on data already present.
-- Run `ALTER TABLE … VALIDATE CONSTRAINT …` once the existing rows are known to
-- be clean.
--
-- Five more are declared on SQLite and cannot be declared here as things
-- stand, because the referencing column is TEXT (or INTEGER) and the key it
-- points at is UUID: admin_roles.granted_by, carpool_live_locations.ride_id,
-- marketplace_escrow.listing_id, marketplace_auctions.listing_id and
-- shop_analytics_snapshots.shop_id. Making those real needs the columns
-- retyped, which is a data migration and not something to write unseen.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── carpool ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_carpool_rides_driver ON carpool_rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_status ON carpool_rides (status);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_date ON carpool_rides (ride_date);
CREATE INDEX IF NOT EXISTS idx_carpool_rides_geo ON carpool_rides (from_lat, from_lng, to_lat, to_lng);
CREATE INDEX IF NOT EXISTS idx_carpool_bids_ride ON carpool_bids (ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bids_bidder ON carpool_bids (bidder_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bookings_ride ON carpool_bookings (ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_bookings_passenger ON carpool_bookings (passenger_id);
CREATE INDEX IF NOT EXISTS idx_carpool_ratings_rated ON carpool_ratings (rated_id);
CREATE INDEX IF NOT EXISTS idx_carpool_waypoints_ride ON carpool_ride_waypoints (ride_id);
CREATE INDEX IF NOT EXISTS idx_carpool_live_loc_ride ON carpool_live_locations (ride_id, recorded_at DESC);

-- ── marketplace ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings (status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings (category);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_listing ON marketplace_offers (listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_buyer ON marketplace_offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_saved_user ON marketplace_saved (user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chats_listing ON marketplace_chats (listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_msgs_chat ON marketplace_chat_messages (chat_id);

-- ── jobs ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_postings_sector ON local_job_postings (sector);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON local_job_postings (status);
CREATE INDEX IF NOT EXISTS idx_job_applications_stage ON job_applications (stage);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications (applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_resumes_user ON job_resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_user ON job_skills (user_id);
CREATE INDEX IF NOT EXISTS idx_job_saved_user ON job_saved (user_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_job_interviews_app ON job_interviews (application_id);
CREATE INDEX IF NOT EXISTS idx_job_interviews_candidate ON job_interviews (candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_chat_msgs_chat ON job_chat_messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_job_salary_company ON job_salary_insights (company_id);
CREATE INDEX IF NOT EXISTS idx_company_reviews_company ON company_reviews (company_id);

-- ── cart, regions, admin ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items (session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_regions_lat_lng ON regions (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles (user_id);

-- ── foreign keys ───────────────────────────────────────────────────────────
-- ADD CONSTRAINT has no IF NOT EXISTS, so each is guarded on the catalog.
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('shop_categories',          'parent_category_id', 'shop_categories',       'shop_categories_parent_category_id_fkey'),
      ('carpool_group_members',    'group_id',           'carpool_groups',        'carpool_group_members_group_id_fkey'),
      ('marketplace_auction_bids', 'auction_id',         'marketplace_auctions',  'marketplace_auction_bids_auction_id_fkey'),
            ('job_assessment_attempts',  'assessment_id',      'job_skill_assessments', 'job_assessment_attempts_assessment_id_fkey')
    ) AS t(child, child_column, parent, constraint_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
        JOIN pg_class r ON r.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = r.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.contype = 'f' AND n.nspname = 'public'
         AND r.relname = fk.child AND a.attname = fk.child_column
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (id) NOT VALID',
        fk.child, fk.constraint_name, fk.child_column, fk.parent
      );
      RAISE NOTICE '116: foreign key added on %.%', fk.child, fk.child_column;
    END IF;
  END LOOP;
END $$;
