-- SQLite variant of 105_merge_duplicate_categories.sql. See that file for why
-- the older slug wins and why duplicates are deactivated rather than deleted.
-- BOOLEAN FALSE becomes 0; the runner wraps each migration itself, so the
-- explicit transaction is dropped.
-- ─────────────────────────────────────────────────────────────────────────────
-- 105: Merge six duplicate shop categories
--
-- shop_categories held twelve rows where there should be six. Each pair is the
-- same category seeded twice, twelve days apart:
--
--   pest-control          (2026-08-11)  /  pest-control-services       (2026-08-23)
--   deep-cleaning         (2026-08-11)  /  deep-cleaning-services      (2026-08-23)
--   catering-party        (2026-08-11)  /  catering-party-services     (2026-08-23)
--   pathology-labs        (2026-08-11)  /  pathology-labs-diagnostics  (2026-08-23)
--   physiotherapy         (2026-08-11)  /  physiotherapy-chiropractic  (2026-08-23)
--   ro-water-purifier     (2026-08-11)  /  ro-water-purifier-service   (2026-08-23)
--
-- The later set looks like it was added to make the five routing maps agree:
-- the router keys were extended and matching category rows were inserted,
-- rather than the new keys being pointed at the categories that already
-- existed. Nothing failed, because both slugs route to the same view.
--
-- What it costs is discovery. The directory lists "Pest Control" and "Pest
-- Control Services" as two categories; the shops divide between them, so a
-- customer browsing either one sees half the pest control services on the
-- platform and no indication the other half exists. Category filters, counts
-- and the territory/category matrix all inherit the split.
--
-- The older slug wins in each pair: it is the one defined in init.sql, it is
-- referenced in noticeably more source files, and it is what any stored data
-- predating 23 August already points at.
--
-- The duplicate rows are DEACTIVATED, not deleted. A delete would cascade into
-- category_attributes and strand foreign keys in any table holding a historical
-- reference; deactivating removes them from the directory while leaving old
-- rows resolvable. The routing maps deliberately keep both keys, so a cached
-- client or a stale deep link using the retired slug still resolves to the
-- right view instead of falling back to the generic one.
-- ─────────────────────────────────────────────────────────────────────────────



CREATE TEMP TABLE category_merges (duplicate_slug TEXT, canonical_slug TEXT);
INSERT INTO category_merges (duplicate_slug, canonical_slug) VALUES
    ('pest-control-services',      'pest-control'),
    ('deep-cleaning-services',     'deep-cleaning'),
    ('catering-party-services',    'catering-party'),
    ('pathology-labs-diagnostics', 'pathology-labs'),
    ('physiotherapy-chiropractic', 'physiotherapy'),
    ('ro-water-purifier-service',  'ro-water-purifier');

-- Repoint every table that carries a category_id. Missing one of these leaves
-- rows pointing at a category the directory no longer shows, which is the same
-- invisibility the merge is meant to cure.
UPDATE local_shops SET category_id = (
    SELECT canon.id FROM shop_categories canon
      JOIN category_merges m ON m.canonical_slug = canon.slug
      JOIN shop_categories dup ON dup.slug = m.duplicate_slug
     WHERE dup.id = local_shops.category_id
) WHERE category_id IN (
    SELECT dup.id FROM shop_categories dup JOIN category_merges m ON m.duplicate_slug = dup.slug
);

UPDATE shop_products SET category_id = (
    SELECT canon.id FROM shop_categories canon
      JOIN category_merges m ON m.canonical_slug = canon.slug
      JOIN shop_categories dup ON dup.slug = m.duplicate_slug
     WHERE dup.id = shop_products.category_id
) WHERE category_id IN (
    SELECT dup.id FROM shop_categories dup JOIN category_merges m ON m.duplicate_slug = dup.slug
);

UPDATE home_service_providers SET category_id = (
    SELECT canon.id FROM shop_categories canon
      JOIN category_merges m ON m.canonical_slug = canon.slug
      JOIN shop_categories dup ON dup.slug = m.duplicate_slug
     WHERE dup.id = home_service_providers.category_id
) WHERE category_id IN (
    SELECT dup.id FROM shop_categories dup JOIN category_merges m ON m.duplicate_slug = dup.slug
);

UPDATE home_service_bookings SET category_id = (
    SELECT canon.id FROM shop_categories canon
      JOIN category_merges m ON m.canonical_slug = canon.slug
      JOIN shop_categories dup ON dup.slug = m.duplicate_slug
     WHERE dup.id = home_service_bookings.category_id
) WHERE category_id IN (
    SELECT dup.id FROM shop_categories dup JOIN category_merges m ON m.duplicate_slug = dup.slug
);

-- The territory matrix is (category, territory) unique, so a blind repoint can
-- collide with a row the canonical category already has. Drop the duplicate's
-- rows where the canonical one is already present, then move the rest.
DELETE FROM category_territory_matrix
 WHERE category_id IN (SELECT dup.id FROM shop_categories dup JOIN category_merges m ON m.duplicate_slug = dup.slug)
   AND territory_id IN (
        SELECT ctm.territory_id FROM category_territory_matrix ctm
          JOIN shop_categories canon ON canon.id = ctm.category_id
          JOIN category_merges m ON m.canonical_slug = canon.slug
   );

UPDATE category_territory_matrix SET category_id = (
    SELECT canon.id FROM shop_categories canon
      JOIN category_merges m ON m.canonical_slug = canon.slug
      JOIN shop_categories dup ON dup.slug = m.duplicate_slug
     WHERE dup.id = category_territory_matrix.category_id
) WHERE category_id IN (
    SELECT dup.id FROM shop_categories dup JOIN category_merges m ON m.duplicate_slug = dup.slug
);

-- Finally hide the duplicates from the directory.
UPDATE shop_categories
   SET is_active = 0
 WHERE slug IN (SELECT duplicate_slug FROM category_merges);

DROP TABLE category_merges;


