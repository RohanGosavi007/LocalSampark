-- LocalSampark Database Maintenance and Optimization Scripts

-- 1. Optimize query planner statistics and reclaim unused storage space
VACUUM ANALYZE users;
VACUUM ANALYZE local_shops;
VACUUM ANALYZE regions;
VACUUM ANALYZE orders;
VACUUM ANALYZE admin_config;
VACUUM ANALYZE chat_messages;
VACUUM ANALYZE carpool_rides;
VACUUM ANALYZE marketplace_listings;

-- 2. Rebuild index structures to resolve potential bloat
REINDEX TABLE users;
REINDEX TABLE local_shops;
REINDEX TABLE regions;
REINDEX TABLE orders;
REINDEX TABLE admin_config;
REINDEX TABLE chat_messages;
REINDEX TABLE carpool_rides;
REINDEX TABLE marketplace_listings;

-- 3. Display table disk storage sizes for monitoring
SELECT 
    relname AS table_name, 
    pg_size_pretty(pg_total_relation_size(class.oid)) AS total_size,
    pg_size_pretty(pg_relation_size(class.oid)) AS table_size,
    pg_size_pretty(pg_indexes_size(class.oid)) AS index_size
FROM 
    pg_class class
JOIN 
    pg_namespace ns ON ns.oid = class.relnamespace
WHERE 
    ns.nspname = 'public' 
    AND class.relkind = 'r'
ORDER BY 
    pg_total_relation_size(class.oid) DESC;
