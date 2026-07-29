-- 10x Scale: Database Query Audit
-- Run this in psql to verify spatial index usage and execution time (< 10ms)

-- Enable timing
\timing on

-- Test 1: Fetch nearby shops using GIST spatial index and earthdistance
EXPLAIN ANALYZE
SELECT *,
earth_distance(ll_to_earth(19.0760, 72.8777), ll_to_earth(latitude, longitude)) / 1000 AS distance_km
FROM local_shops
WHERE is_active = 1 
AND approval_status = 'approved'
AND ll_to_earth(latitude, longitude) <@ earth_box(ll_to_earth(19.0760, 72.8777), 5 * 1000)
ORDER BY ll_to_earth(latitude, longitude) <-> ll_to_earth(19.0760, 72.8777) ASC 
LIMIT 200;

-- Test 2: Verify Partitioning pruning by querying specific pincode
EXPLAIN ANALYZE
SELECT id, name, category_id
FROM local_shops
WHERE pincode = '400001' AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 50;
