import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'offline_queue',
      columns: [
        { name: 'url', type: 'string' },
        { name: 'method', type: 'string' },
        { name: 'body', type: 'string', isOptional: true },
        { name: 'headers', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'cached_shops',
      columns: [
        { name: 'shop_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' }, // JSON stringified shop data
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'cached_orders',
      columns: [
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' }, // JSON stringified order data
        { name: 'status', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    })
  ]
});
