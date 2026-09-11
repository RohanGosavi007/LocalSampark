/**
 * ═══════════════════════════════════════════════════════════════════════
 * Singleton Prisma Client — Centralized Database Access
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * 10x FIX: Previously, multiple files created their own PrismaClient()
 * instances (e.g., shop-management.controller.js line 7, auth.middleware.js).
 * Each instance opens its own connection pool, wasting database connections
 * and causing potential connection leaks.
 * 
 * This module ensures ONE PrismaClient instance is shared across the app.
 * Import with: const { prisma } = require('../../config/prisma');
 * ═══════════════════════════════════════════════════════════════════════
 */

const logger = require('./logger');

let prisma = null;

function getPrismaClient() {
  if (process.env.USE_SQLITE === 'true') return null;

  if (!prisma) {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production'
        ? [{ emit: 'event', level: 'error' }]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ],
      // 10x: Use PgBouncer-compatible settings in production
      datasources: process.env.NODE_ENV === 'production' ? {
        db: {
          url: process.env.DATABASE_URL || process.env.DIRECT_URL,
        }
      } : undefined,
    });

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      prisma.$on('query', (e) => {
        if (e.duration > 500) {
          logger.warn(`⚠️ Slow Prisma query (${e.duration}ms): ${e.query.substring(0, 120)}`);
        }
      });
    }

    // Always log errors
    prisma.$on('error', (e) => {
      logger.error('Prisma Client Error: ' + e.message);
    });

    // 10x: Connection pool monitoring
    logger.info('✅ Prisma Client initialized (singleton)');
  }

  return prisma;
}

// Graceful disconnect helper
async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Prisma Client disconnected');
  }
}

/**
 * The one client every module should use.
 *
 * getPrismaClient() deliberately returns null when USE_SQLITE=true, because in
 * that mode the app talks to SQLite through config/database instead. That made
 * the singleton unusable for the seven modules that genuinely need a Prisma
 * client in BOTH modes, so each of them had fallen back to its own
 * `new PrismaClient()` at module scope -- including auth.middleware.js, which
 * the header of this file names as already fixed. Eight independent connection
 * pools were being opened against the same database; with a hosted Postgres
 * connection cap that is how a deploy starts refusing connections under load
 * while every pool sits mostly idle.
 *
 * getSharedPrisma() resolves to the configured singleton where there is one and
 * otherwise constructs exactly one client of its own, so there is a single pool
 * in every mode.
 */
let shared = null;
function getSharedPrisma() {
  if (!shared) {
    shared = getPrismaClient();
    if (!shared) {
      const { PrismaClient } = require('@prisma/client');
      shared = new PrismaClient();
    }
  }
  return shared;
}

/**
 * A lazy stand-in for the client, so a module can keep
 *
 *     const prisma = require('../../config/prisma').sharedPrisma;
 *
 * at module scope without constructing anything at require time. Resolution
 * happens on first property access, by which point the environment is loaded.
 *
 * Functions are bound to the real client: `prisma.$transaction(...)` would
 * otherwise be invoked with the proxy as `this`.
 */
const sharedPrisma = new Proxy({}, {
  get(_target, prop) {
    const client = getSharedPrisma();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has(_target, prop) { return prop in getSharedPrisma(); },
});

module.exports = {
  get prisma() { return getPrismaClient(); },
  getPrismaClient,
  getSharedPrisma,
  sharedPrisma,
  disconnectPrisma,
};
