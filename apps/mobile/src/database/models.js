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
  set url(val) { this._setRaw('url', val); }
  get method() { return this._getRaw('method'); }
  set method(val) { this._setRaw('method', val); }
  get body() { return this._getRaw('body'); }
  set body(val) { this._setRaw('body', typeof val === 'string' ? val : JSON.stringify(val || {})); }
  get headers() { return this._getRaw('headers'); }
  set headers(val) { this._setRaw('headers', typeof val === 'string' ? val : JSON.stringify(val || {})); }
  get createdAt() { return new Date(this._getRaw('created_at')); }
  set createdAt(val) { this._setRaw('created_at', val instanceof Date ? val.getTime() : Number(val) || Date.now()); }
}

export class CachedShop extends Model {
  static table = 'cached_shops';

  get shopId() { return this._getRaw('shop_id'); }
  set shopId(val) { this._setRaw('shop_id', String(val || '')); }
  get data() { return sanitizeJson(this._getRaw('data')); }
  set data(val) { this._setRaw('data', typeof val === 'string' ? val : JSON.stringify(val || {})); }
  get updatedAt() { return new Date(this._getRaw('updated_at')); }
  set updatedAt(val) { this._setRaw('updated_at', val instanceof Date ? val.getTime() : Number(val) || Date.now()); }
}

export class CachedOrder extends Model {
  static table = 'cached_orders';

  get orderId() { return this._getRaw('order_id'); }
  set orderId(val) { this._setRaw('order_id', String(val || '')); }
  get data() { return sanitizeJson(this._getRaw('data')); }
  set data(val) { this._setRaw('data', typeof val === 'string' ? val : JSON.stringify(val || {})); }
  get status() { return this._getRaw('status'); }
  set status(val) { this._setRaw('status', String(val || '')); }
  get updatedAt() { return new Date(this._getRaw('updated_at')); }
  set updatedAt(val) { this._setRaw('updated_at', val instanceof Date ? val.getTime() : Number(val) || Date.now()); }
}
