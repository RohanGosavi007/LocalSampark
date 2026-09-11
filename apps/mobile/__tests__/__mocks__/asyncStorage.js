const store = new Map();
module.exports = {
  __store: store,
  getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
  setItem: jest.fn(async (k, v) => void store.set(k, v)),
  removeItem: jest.fn(async (k) => void store.delete(k)),
  multiRemove: jest.fn(async (keys) => keys.forEach((k) => store.delete(k))),
};
