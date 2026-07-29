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
    // Disable JSI in release builds — JSI requires TurboModules which may
    // not be fully linked on all devices; falling back to the bridge adapter
    // is slower but never crashes.
    jsi: false,
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
