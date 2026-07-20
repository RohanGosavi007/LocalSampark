import { Model } from '@nozbe/watermelondb';

const sanitizeJson = raw => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return raw;
  }
};

export class OfflineQueue extends Model {
  static table = 'offline_queue';

  // Using raw field getters/setters instead of decorators to avoid babel config issues
  get url() { return this._getRaw('url'); }
  get method() { return this._getRaw('method'); }
  get body() { return this._getRaw('body'); }
  get headers() { return this._getRaw('headers'); }
  get createdAt() { return new Date(this._getRaw('created_at')); }
}

export class CachedShop extends Model {
  static table = 'cached_shops';

  get shopId() { return this._getRaw('shop_id'); }
  get data() { return sanitizeJson(this._getRaw('data')); }
  get updatedAt() { return new Date(this._getRaw('updated_at')); }
}

export class CachedOrder extends Model {
  static table = 'cached_orders';

  get orderId() { return this._getRaw('order_id'); }
  get data() { return sanitizeJson(this._getRaw('data')); }
  get status() { return this._getRaw('status'); }
  get updatedAt() { return new Date(this._getRaw('updated_at')); }
}
