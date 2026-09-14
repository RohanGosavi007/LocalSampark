require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

if (process.env.USE_SQLITE === 'true') {
  const sqlite = require('./database.sqlite');
  // Diagnostics go to stderr, not stdout. Loading this module used to print two
  // console.log lines, which corrupted the output of every CLI tool that emits
  // JSON on stdout — the schema scripts under scripts/ all do. Set
  // DB_DEBUG=1 to see them.
  if (process.env.DB_DEBUG === '1') {
    console.error('[db] USE_SQLITE=true; exports:', Object.keys(sqlite).join(', '));
  }
  module.exports = sqlite;
} else {
  const { Pool } = require('pg');
  const logger = require('./logger');

  const isProduction = process.env.NODE_ENV === 'production';

  /**
   * TLS for the managed Postgres connection.
   *
   * This was hardcoded to `{ rejectUnauthorized: false }`, which disables
   * certificate verification outright: the client encrypts the link but will
   * accept ANY certificate, so the connection is not protected against an
   * active man-in-the-middle. Every credential and every row of user data
   * crosses that link.
   *
   * Managed providers (Supabase, Render, Heroku) sign with a private CA, which
   * is why the flag gets switched off. The correct fix is to supply that CA via
   * DB_SSL_CA (or a CA bundle path in PGSSLROOTCERT) and verify against it.
   * DB_SSL_REJECT_UNAUTHORIZED=false remains available as an explicit, visible
   * opt-out for a provider that genuinely cannot supply one — but it now has to
   * be a deliberate deployment decision rather than the silent default.
   */
  function buildSslConfig() {
    if (process.env.DB_SSL === 'false') return false;
    if (process.env.DB_SSL_CA) {
      return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    }
    if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
      logger.warn(
        '⚠️  SECURITY: DB TLS certificate verification is DISABLED ' +
        '(DB_SSL_REJECT_UNAUTHORIZED=false). The database connection is encrypted ' +
        'but not authenticated. Set DB_SSL_CA to your provider CA instead.'
      );
      return { rejectUnauthorized: false };
    }
    return { rejectUnauthorized: true };
  }

  /**
   * Runtime uses DATABASE_URL (the pooled/PgBouncer endpoint). DIRECT_URL is
   * the unpooled endpoint Prisma needs for migrations and DDL; preferring it
   * here — as this did — pointed every request in the app at the connection
   * endpoint that has the lowest connection ceiling, which is exactly backwards
   * under production load.
   */
  const runtimeUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

  const poolConfig = runtimeUrl
    ? {
        connectionString: runtimeUrl,
        max: parseInt(process.env.DB_POOL_MAX || (isProduction ? '50' : '20'), 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        // A query that hangs holds its pool connection indefinitely; enough of
        // them and the pool is exhausted and the API stops serving entirely.
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
        ssl: buildSslConfig(),
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        // 10x Scale: Route through PgBouncer transaction pool in production
        port: process.env.NODE_ENV === 'production' ? parseInt(process.env.DB_PORT || '6432') : parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'localsampark',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: parseInt(process.env.DB_POOL_MAX || (isProduction ? '100' : '20'), 10), // High Node.js side pool limits since PgBouncer handles the DB limits
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
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
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn(`⚠️ Slow query (${duration}ms): ` + text.substring(0, 100));
      }
      return result;
    } catch (err) {
      // Auto-heal boolean = integer mismatch in Postgres (error code 42883)
      if (err.code === '42883' && (text.includes('= 1') || text.includes('= 0') || text.includes('!= 0'))) {
        let fixedSql = text
          .replace(/\b(is_active|is_verified|is_available|is_online|is_tenant|active)\s*=\s*1\b/gi, '$1 = true')
          .replace(/\b(is_active|is_verified|is_available|is_online|is_tenant|active)\s*=\s*0\b/gi, '$1 = false');
        return await pool.query(fixedSql, params);
      }
      throw err;
    }
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
      // A failed ROLLBACK (dead connection, statement timeout) would otherwise
      // replace the real error with a confusing secondary one.
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('ROLLBACK failed after transaction error: ' + rollbackError.message);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Transaction compatibility function matching Postgres transaction signature
  async function transaction(callback) {
    return withTransaction(callback);
  }

  /**
   * Schema introspection, mirroring the SQLite driver's API so tooling can run
   * against either engine without branching. information_schema is the
   * PostgreSQL equivalent of PRAGMA table_info.
   */
  async function listTables() {
    const res = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    return (res.rows || []).map((r) => r.table_name);
  }

  async function getTableColumns(table) {
    const res = await query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      [table]
    );
    return (res.rows || []).map((r) => ({
      name: r.column_name,
      type: (r.data_type || '').toUpperCase(),
      notNull: r.is_nullable === 'NO',
      defaultValue: r.column_default,
      primaryKey: false, // not needed by current callers; separate query if it becomes so
    }));
  }

  module.exports = {
    pool,
    connectDB,
    query,
    queryOne,
    queryMany,
    withTransaction,
    transaction,
    listTables,
    getTableColumns
  };
}
