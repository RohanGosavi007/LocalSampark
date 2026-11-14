const LocalStorageProvider = require('./LocalStorageProvider');
const S3StorageProvider = require('./S3StorageProvider');

let currentProvider = null;

function getStorageProvider() {
  if (currentProvider) return currentProvider;

  const driver = process.env.STORAGE_DRIVER || (process.env.STORAGE_ENDPOINT ? 's3' : 'local');

  if (driver === 's3') {
    currentProvider = new S3StorageProvider();
  } else {
    currentProvider = new LocalStorageProvider();
  }

  return currentProvider;
}

/** Tests substitute the provider; passing null restores the configured one. */
function _setProviderForTests(provider) {
  currentProvider = provider;
}

module.exports = {
  getStorageProvider,
  _setProviderForTests,
  LocalStorageProvider,
  S3StorageProvider,
};
