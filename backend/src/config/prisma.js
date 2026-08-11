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

module.exports = {
  get prisma() { return getPrismaClient(); },
  getPrismaClient,
  disconnectPrisma,
};
