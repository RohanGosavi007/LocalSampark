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
  const { Pool, types } = require('pg');
  const logger = require('./logger');

  // Numbers come back as numbers, as they do from SQLite.
  //
  // node-postgres returns NUMERIC/DECIMAL (OID 1700) and BIGINT (OID 20, the
  // type of COUNT(*)) as strings, to avoid losing precision. Every amount in
  // this schema is a rupee value with two decimals and every BIGINT is a count
  // or an id far below 2^53, so a JavaScript number is exact for all of them.
  // Left as strings, the same API answered `delivery_fee: 20` on SQLite and
  // `"20.00"` on PostgreSQL, and code that summed amounts concatenated them
  // ("0240.0055.00" instead of 295) — found when the suites were run on
  // PostgreSQL (F-127).
  types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
  types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

  // Dates and times come back as text, as they do from SQLite:
  //   timestamp (no zone)  -> the stored UTC text, 'YYYY-MM-DD HH:MM:SS'
  //   timestamptz          -> ISO 8601 in UTC with its 'Z', e.g. '2026-11-10T02:00:00.000Z'
  //   date                 -> 'YYYY-MM-DD'
  // The timestamptz form carries its zone so `new Date(value)` is the right
  // instant on any server; a bare 'YYYY-MM-DD HH:MM:SS' is read by JavaScript
  // as LOCAL time, which made a live auction read as already ended on a
  // machine five and a half hours ahead of UTC.
  //
  // node-postgres turns `timestamp without time zone` (OID 1114) into a Date
  // in the server process's LOCAL zone. The app stores UTC (utils/sqlTime), so
  // on any machine not set to UTC every such value moved by the zone offset
  // (5h30 here: a campaign stored for 04:30 read back as 23:00 the day before),
  // and code written for the text SQLite returns (`.replace(' ', 'T')`, string
  // comparison against sqlTimestamp()) got a Date and produced NaN or wrong
  // answers. Found when the suites were run on PostgreSQL (F-127).
  const pgUtcText = (v) => {
    if (v === null) return null;
    // '2026-12-09 16:02:47.123+05:30' / '+05' -> an instant -> ISO in UTC.
    const d = new Date(String(v).replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  };
  types.setTypeParser(1114, (v) => (v === null ? null : String(v).slice(0, 19)));  // stored UTC text, as written
  types.setTypeParser(1184, pgUtcText);                                            // timestamptz -> ISO, UTC
  types.setTypeParser(1082, (v) => v);                                             // date -> 'YYYY-MM-DD'

  // Booleans as 1 / 0, which is what SQLite stores and what the code compares
  // against (`=== 1`, `? 1 : 0`). A PostgreSQL boolean column answered
  // true/false instead, so the same flag read 1 in development and `true` in
  // production. Written back, 1/0 is accepted by a boolean column.
  types.setTypeParser(16, (v) => (v === null ? null : (v === 't' || v === 'true' ? 1 : 0)));

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
    const isLocal = Boolean(
      (urlStr && (urlStr.includes('127.0.0.1') || urlStr.includes('localhost'))) ||
      process.env.DB_HOST === '127.0.0.1' ||
      process.env.DB_HOST === 'localhost'
    );
    if (isLocal && process.env.DB_SSL !== 'true') return false;

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

  // Every session in UTC, so CURRENT_TIMESTAMP / NOW() defaults agree with the
  // UTC values the app writes. A local PostgreSQL install inherits the OS zone
  // (Asia/Calcutta on the development machine); Supabase is already UTC.
  //
  // Passed as pg-pool's `onConnect` option, which the pool awaits before it
  // hands the client to anyone. It used to be a pool.on('connect') listener
  // that fired the SET without waiting, so the caller's first query was queued
  // behind it on a busy client: deprecated in pg 8 (the DeprecationWarning in
  // every PostgreSQL run) and removed in pg 9. Not a startup `options` param,
  // because poolers such as PgBouncer reject unknown startup parameters.
  const setSessionUtc = async (client) => {
    try {
      await client.query("SET TIME ZONE 'UTC'");
    } catch (err) {
      logger.warn('Could not set session time zone: ' + err.message);
    }
  };
  const withSessionSetup = (config) => ({ ...config, onConnect: setSessionUtc });

  let activePool = new Pool(withSessionSetup(buildPoolConfig()));

  activePool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error: ' + err);
  });

  function switchPool(newConfig) {
    try {
      activePool.end().catch(() => {});
    } catch {}
    activePool = new Pool(withSessionSetup(newConfig));
    activePool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error: ' + err);
    });
  }

  // Proxy pool so callers that imported { pool } invoke methods on the current activePool
  const pool = new Proxy({}, {
    get(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
        return target[prop];
      }
      const val = activePool[prop];
      if (typeof val === 'function' && !val._isMockFunction) {
        return val.bind(activePool);
      }
      return val;
    },
    set(target, prop, value) {
      if (value && value._isMockFunction) {
        target[prop] = value;
      } else {
        delete target[prop];
        activePool[prop] = value;
      }
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

  // A lookup by an id PostgreSQL cannot parse as a UUID matches no row.
  //
  // SQLite compares any text with any column, so `WHERE id = 'x'` simply finds
  // nothing there; PostgreSQL refuses the statement (22P02) before reading a
  // row. Around a hundred routes look a record up by a path parameter and
  // answered a mistyped or probing id with 500 on PostgreSQL alone (F-113,
  // found when the suites were ported off their SQLite pin, F-127). For a
  // read (SELECT/WITH) or a DELETE the honest result is "no rows", which is
  // what this returns, and it is logged. An UPDATE qualifies only when the
  // rejected value was a filter (every placeholder bound to it sits after the
  // WHERE); one being written still fails, as does any INSERT. Integer ids
  // (cart_items.id) get the same treatment. Statements inside withTransaction()
  // are untouched: PostgreSQL aborts the transaction on the error.
  const LEADING = /^\s*(?:\/\*[\s\S]*?\*\/\s*|--[^\n]*\n\s*)*(SELECT|WITH|DELETE|UPDATE)\b/i;
  const UNPARSEABLE = /invalid input syntax for type (uuid|integer|bigint|smallint): "(.*)"$/i;
  function isUnparseableIdLookup(err, text, params) {
    if (!err || err.code !== '22P02' || typeof text !== 'string') return false;
    const m = UNPARSEABLE.exec(err.message || '');
    const lead = LEADING.exec(text);
    if (!m || !lead) return false;
    if (lead[1].toUpperCase() !== 'UPDATE') return true;
    const where = text.search(/\bWHERE\b/i);
    if (where < 0 || !Array.isArray(params)) return false;
    const slots = params
      .map((p, i) => (p !== null && p !== undefined && String(p) === m[2] ? i + 1 : 0))
      .filter(Boolean);
    if (!slots.length) return false;
    return slots.every((n) => {
      const uses = [...text.matchAll(new RegExp(`\\$${n}(?!\\d)`, 'g'))].map((x) => x.index);
      return uses.length > 0 && uses.every((i) => i > where);
    });
  }

  async function query(text, params) {
    const start = Date.now();
    let result;
    try {
      result = await activePool.query(text, params);
    } catch (err) {
      if (!isUnparseableIdLookup(err, text, params)) throw err;
      logger.warn(`[db] ${err.message} — treated as no rows: ${String(text).replace(/\s+/g, ' ').slice(0, 120)}`);
      return { rows: [], rowCount: 0, command: LEADING.exec(text)[1].toUpperCase(), fields: [] };
    }
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
