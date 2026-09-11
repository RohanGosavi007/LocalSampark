// Stand-in for src/lib/secureStorage — the SecureStore-backed token store.
const tokens = new Map();
module.exports = {
  __tokens: tokens,
  SecureTokenStorage: {
    getToken: jest.fn(async (k) => (tokens.has(k) ? tokens.get(k) : null)),
    setToken: jest.fn(async (k, v) => void tokens.set(k, v)),
    deleteToken: jest.fn(async (k) => void tokens.delete(k)),
  },
};
