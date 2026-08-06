require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

if (process.env.USE_SQLITE === 'true') {
  module.exports = require('./database.sqlite');
} else {
  const { Pool } = require('pg');
  const logger = require('./logger');

  const poolConfig = process.env.DIRECT_URL || process.env.DATABASE_URL 
    ? { connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        // 10x Scale: Route through PgBouncer transaction pool in production
        port: process.env.NODE_ENV === 'production' ? parseInt(process.env.DB_PORT || '6432') : parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'localsampark',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: process.env.NODE_ENV === 'production' ? 100 : 20, // High Node.js side pool limits since PgBouncer handles the DB limits
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error: ' + err);
  });

  async function connectDB() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      logger.info(`   Database time: ${result.rows[0].now}`);
    } finally {
      client.release();
    }
  }

  async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`⚠️ Slow query (${duration}ms): ` + text.substring(0, 100));
    }
    return result;
  }

  async function queryOne(text, params) {
    const result = await query(text, params);
    return result.rows[0] || null;
  }

  async function queryMany(text, params) {
    const result = await query(text, params);
    return result.rows;
  }

  async function withTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Transaction compatibility function matching Postgres transaction signature
  async function transaction(callback) {
    return withTransaction(callback);
  }

  module.exports = {
    pool,
    connectDB,
    query,
    queryOne,
    queryMany,
    withTransaction,
    transaction
  };
}
