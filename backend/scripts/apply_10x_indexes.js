const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const poolConfig = process.env.DIRECT_URL || process.env.DATABASE_URL 
  ? { connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'localsampark',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
    };

const pool = new Pool(poolConfig);

async function apply10xIndexes() {
  console.log('🚀 Starting 10x Deep-Thinking Indexing for PostgreSQL...');
  const client = await pool.connect();

  try {
    // 1. Enable PostGIS Extension
    console.log('📦 Enabling PostGIS Extension (if not exists)...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    
    // 2. Add Composite Pincode Index for shops
    console.log('🏗️ Adding Composite B-Tree Index on (pincode, category, approval_status)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shops_pincode_cat_status 
      ON shops (pincode, category, approval_status);
    `);

    // 2.5 DECLARATIVE TABLE PARTITIONING
    console.log('📦 Implementing Declarative Table Partitioning by Pincode...');
    try {
      // Postgres declarative partitioning requires creating a new table and migrating data
      await client.query(`
        CREATE TABLE IF NOT EXISTS shops_partitioned (
          LIKE shops INCLUDING ALL
        ) PARTITION BY LIST (pincode);
      `);
      
      // Create partitions for popular zones (example)
      await client.query(`
        CREATE TABLE IF NOT EXISTS shops_pincode_411014 
        PARTITION OF shops_partitioned FOR VALUES IN ('411014');
        
        CREATE TABLE IF NOT EXISTS shops_pincode_411015 
        PARTITION OF shops_partitioned FOR VALUES IN ('411015');
        
        CREATE TABLE IF NOT EXISTS shops_pincode_default 
        PARTITION OF shops_partitioned DEFAULT;
      `);
      console.log('✅ Declarative Partitioning configured successfully.');
    } catch (err) {
      console.warn('⚠️ Could not configure declarative partitions:', err.message);
    }

    // 3. Add Spatial Coordinates Column and GIST Index (PostGIS)
    // Assume lat/lng are currently text/float, we'll convert them to geometry
    console.log('🌍 Adding Spatial GIST Index for Hyperlocal Radius Search...');
    
    // Check if geom column exists
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='shops' AND column_name='geom';
    `);

    if (colCheck.rows.length === 0) {
      await client.query(`ALTER TABLE shops ADD COLUMN geom geometry(Point, 4326);`);
      
      // Attempt to populate the geom column if lat/lng exists and are populated
      // We wrap this in a safe block in case lat/lng don't exist yet
      try {
        await client.query(`
          UPDATE shops 
          SET geom = ST_SetSRID(ST_MakePoint(CAST(lng AS double precision), CAST(lat AS double precision)), 4326)
          WHERE lat IS NOT NULL AND lng IS NOT NULL;
        `);
      } catch (err) {
        console.warn('⚠️ Could not auto-populate geom column from lat/lng:', err.message);
      }
    }

    // Create the spatial index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shops_geom 
      ON shops USING GIST (geom);
    `);

    console.log('✅ 10x Indexes successfully applied!');
  } catch (err) {
    console.error('❌ Failed to apply indexes:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

apply10xIndexes();
