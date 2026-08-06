// ═══════════════════════════════════════════════════════════════════════
// Prisma Client Singleton — Compatible with SQLite (dev) & PostgreSQL (prod)
// ═══════════════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
} else {
  // In development, reuse the client across hot-reloads (nodemon)
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
