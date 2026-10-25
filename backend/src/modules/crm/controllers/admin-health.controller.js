const os = require('os');
const crypto = require('crypto');
const { query } = require('../../../config/database');
const requestMetrics = require('../../../utils/requestMetrics');
const CacheService = require('../../../services/cache.service');
// NOW() is PostgreSQL-only; SQLite needs CURRENT_TIMESTAMP.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

/**
 * Size, connection count and round-trip time of the database, measured.
 *
 * The two engines have nothing in common here — a catalog function on one, a
 * pragma on the other — so this is one of the few places that branches on the
 * engine. A figure that cannot be read is reported as null. It used to be
 * reported as '24.5' MB and 12 connections, constants that appeared on the
 * dashboard as though they had been measured.
 */
async function databaseStats() {
  const stats = { engine: process.env.USE_SQLITE === 'true' ? 'sqlite' : 'postgresql', sizeMB: null, activeConnections: null, pingMs: null };

  try {
    const started = Date.now();
    await query('SELECT 1');
    stats.pingMs = Date.now() - started;
  } catch { /* left null */ }

  try {
    if (stats.engine === 'sqlite') {
      const pages = await query('PRAGMA page_count');
      const pageSize = await query('PRAGMA page_size');
      const bytes = Number(pages.rows[0].page_count) * Number(pageSize.rows[0].page_size);
      stats.sizeMB = Math.round((bytes / (1024 * 1024)) * 10) / 10;
      // One file, one connection: this process.
      stats.activeConnections = 1;
    } else {
      const size = await query('SELECT pg_database_size(current_database()) AS bytes');
      stats.sizeMB = Math.round((Number(size.rows[0].bytes) / (1024 * 1024)) * 10) / 10;
      const connections = await query(
        'SELECT count(*) AS count FROM pg_stat_activity WHERE datname = current_database()'
      );
      stats.activeConnections = Number(connections.rows[0].count);
    }
  } catch { /* left null */ }

  return stats;
}

exports.getHealthMetrics = async (req, res, next) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = ((usedMem / totalMem) * 100).toFixed(1);

    const cpus = os.cpus();
    const latency = requestMetrics.summary();

    const system = {
      memory: {
        total: totalMem,
        used: usedMem,
        usagePercent: parseFloat(usagePercent)
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0] ? cpus[0].model : 'unknown'
      },
      database: await databaseStats(),
      uptime: os.uptime(),
      processUptime: Math.round(process.uptime()),
      // Measured over the last few hundred requests this process served. Null
      // until there have been some; it was Math.random() before.
      api: {
        avgLatencyMs: latency.avgLatencyMs,
        p95LatencyMs: latency.p95LatencyMs,
        errorRatePercent: latency.errorRatePercent,
        sampleSize: latency.samples,
        scope: 'this server process',
      },
      cache: CacheService.getStats(),
    };

    // Requests that failed or ran slow, as they happened. This was five
    // hard-coded lines dated relative to "now", including a payment webhook
    // signature mismatch and a refused Redis connection that never occurred.
    const logs = requestMetrics.recentNotable(20);

    res.json({ success: true, system, logs });
  } catch (error) {
    next(error);
  }
};

exports.clearGlobalCache = async (req, res, next) => {
  try {
    // Clears the caches and says what it cleared. It used to clear nothing —
    // the body of this handler was an audit entry and "Purged Successfully" —
    // so an admin trying to push out a stale price was told it had worked.
    const purged = await CacheService.clearAll();

    const adminId = req.user.id || req.user.userId;
    try {
      // admin_audit_log.ip_address is NOT NULL, so the caller's address is
      // recorded rather than omitted — an audit row that cannot say where the
      // action came from is not much of an audit row.
      await query(
        `INSERT INTO admin_audit_log
           (id, admin_id, action, target_type, target_id, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, 'CACHE_PURGE', 'system', 'cache', $3, $4, $5, ${NOW})`,
        [
          crypto.randomUUID(),
          adminId,
          req.ip || req.connection?.remoteAddress || 'unknown',
          (req.get && req.get('user-agent')) || null,
          JSON.stringify(purged),
        ]
      );
    } catch(e) {
      console.error('Failed to log audit:', e);
    }

    if (purged.failed.length > 0) {
      return res.status(502).json({
        success: false,
        error: `Cache purge incomplete: ${purged.failed.join(', ')} could not be cleared.`,
        purged,
      });
    }

    res.json({ success: true, message: 'Global Cache Purged Successfully', purged });
  } catch (error) {
    next(error);
  }
};

exports.databaseStats = databaseStats;
