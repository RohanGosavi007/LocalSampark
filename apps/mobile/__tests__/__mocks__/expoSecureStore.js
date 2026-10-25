const store = new Map();

module.exports = {
  __store: store,
  setItemAsync: jest.fn(async (k, v) => void store.set(k, v)),
  getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
  deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
};
