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

  function isRenderBareHost(host) {
    return typeof host === 'string' && host.startsWith('dpg-') && !host.includes('.');
  }

  function getRenderExternalHost(host, region = process.env.RENDER_REGION || process.env.DB_REGION || 'singapore') {
    if (isRenderBareHost(host)) {
      return `${host}.${region}-postgres.render.com`;
    }
    return host;
  }

  function convertRenderUrlToExternal(urlStr, region = process.env.RENDER_REGION || process.env.DB_REGION || 'singapore') {
    if (!urlStr) return urlStr;
    try {
      const parsed = new URL(urlStr);
      if (isRenderBareHost(parsed.hostname)) {
        parsed.hostname = getRenderExternalHost(parsed.hostname, region);
        return parsed.toString();
      }
    } catch {
      const match = urlStr.match(/@([a-z0-9-]+)(\/|:|$)/i);
      if (match && isRenderBareHost(match[1])) {
        const ext = getRenderExternalHost(match[1], region);
        return urlStr.replace(`@${match[1]}`, `@${ext}`);
      }
    }
    return urlStr;
  }

  /**
   * TLS for the managed Postgres connection.
   */
  function buildSslConfig(urlStr = null) {
    if (process.env.DB_SSL === 'false') return false;
    if (process.env.DB_SSL_CA) {
      return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    }
    const isRender = Boolean(
      (urlStr && (urlStr.includes('.render.com') || isRenderBareHost(urlStr))) ||
      process.env.RENDER ||
      process.env.RENDER_SERVICE_ID
    );
    if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' || isRender || isProduction) {
      return { rejectUnauthorized: false };
    }
    return { rejectUnauthorized: true };
  }

  /**
   * Runtime uses DATABASE_URL (the pooled/PgBouncer endpoint). DIRECT_URL is
   * the unpooled endpoint Prisma needs for migrations and DDL.
   */
  const runtimeUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

  function buildPoolConfig(targetUrl = runtimeUrl) {
    if (targetUrl) {
      return {
        connectionString: targetUrl,
        max: parseInt(process.env.DB_POOL_MAX || (isProduction ? '50' : '20'), 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
        ssl: buildSslConfig(targetUrl),
      };
    }

    const rawHost = process.env.DB_HOST || 'localhost';
    const effectiveHost = isRenderBareHost(rawHost) ? getRenderExternalHost(rawHost) : rawHost;

    return {
      host: effectiveHost,
      port: process.env.NODE_ENV === 'production' ? parseInt(process.env.DB_PORT || '6432') : parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'localsampark',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: parseInt(process.env.DB_POOL_MAX || (isProduction ? '100' : '20'), 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
      ssl: buildSslConfig(),
    };
  }

  let activePool = new Pool(buildPoolConfig());

  activePool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error: ' + err);
  });

  function switchPool(newConfig) {
    try {
      activePool.end().catch(() => {});
    } catch {}
    activePool = new Pool(newConfig);
    activePool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error: ' + err);
    });
  }

  // Proxy pool so callers that imported { pool } invoke methods on the current activePool
  const pool = new Proxy({}, {
    get(target, prop) {
      const val = activePool[prop];
      if (typeof val === 'function') {
        return val.bind(activePool);
      }
      return val;
    },
    set(target, prop, value) {
      activePool[prop] = value;
      return true;
    }
  });

  async function connectDB(maxRetries = 5, retryDelayMs = 2000) {
    let lastError = null;
    let switchedToExternal = false;

    // Fast pre-check: if runtimeUrl uses bare Render host, test DNS resolution
    if (runtimeUrl) {
      try {
        const parsed = new URL(runtimeUrl);
        if (isRenderBareHost(parsed.hostname)) {
          const dns = require('dns').promises;
          try {
            await dns.lookup(parsed.hostname);
          } catch (dnsErr) {
            if (dnsErr.code === 'ENOTFOUND') {
              const extUrl = convertRenderUrlToExternal(runtimeUrl);
              logger.warn(`⚠️ Render internal host '${parsed.hostname}' is not resolvable. Automatically switching to external host '${new URL(extUrl).hostname}'...`);
              switchPool(buildPoolConfig(extUrl));
              switchedToExternal = true;
            }
          }
        }
      } catch {}
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await activePool.connect();
        try {
          const result = await client.query('SELECT NOW()');
          logger.info(`   Database connected successfully. Time: ${result.rows[0].now}`);
          return;
        } finally {
          client.release();
        }
      } catch (err) {
        lastError = err;
        logger.warn(`⚠️ Database connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);

        // If error is ENOTFOUND on a Render host and not yet switched, switch to external host now
        const isDnsError = err.code === 'ENOTFOUND' || (err.message && err.message.includes('ENOTFOUND'));
        if (isDnsError && !switchedToExternal && runtimeUrl) {
          const extUrl = convertRenderUrlToExternal(runtimeUrl);
          if (extUrl !== runtimeUrl) {
            logger.warn(`⚠️ ENOTFOUND encountered. Retrying with Render external URL...`);
            switchPool(buildPoolConfig(extUrl));
            switchedToExternal = true;
          }
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    logger.error('❌ Failed to connect to database after ' + maxRetries + ' attempts: ' + (lastError && lastError.message));
    if (process.env.RENDER || (runtimeUrl && runtimeUrl.includes('dpg-'))) {
      logger.error('💡 Render Deployment Troubleshooting:\n' +
        '1. Ensure your Web Service and Database are deployed in the SAME Render region (e.g. Singapore).\n' +
        '2. In the Render Dashboard under your PostgreSQL service, copy the "External Database URL".\n' +
        '3. Go to your Web Service > Environment, and set DATABASE_URL to that External Database URL.');
    }
    throw lastError;
  }

  async function query(text, params) {
    const start = Date.now();
    try {
      const result = await activePool.query(text, params);
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
        return await activePool.query(fixedSql, params);
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
    const client = await activePool.connect();
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
