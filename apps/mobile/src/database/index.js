import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { OfflineQueue, CachedShop, CachedOrder } from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Use JSI for faster synchronous execution
  onSetUpError: error => {
    console.error('Database setup failed:', error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [OfflineQueue, CachedShop, CachedOrder],
});
