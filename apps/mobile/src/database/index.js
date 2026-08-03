// Lazy, crash-safe WatermelonDB initialization
// If native SQLite module is unavailable (e.g. missing native link),
// we export a null database so consumers can gracefully degrade.

let database = null;

try {
  const { Database } = require('@nozbe/watermelondb');
  const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
  const { schema } = require('./schema');
  const { OfflineQueue, CachedShop, CachedOrder } = require('./models');

  const adapter = new SQLiteAdapter({
    schema,
    // Enable JSI for maximum performance.
    jsi: true,
    onSetUpError: error => {
      console.error('WatermelonDB setup failed:', error);
    }
  });

  database = new Database({
    adapter,
    modelClasses: [OfflineQueue, CachedShop, CachedOrder],
  });
} catch (e) {
  console.warn('[Database] WatermelonDB initialization failed — offline features disabled:', e.message);
}

export { database };
