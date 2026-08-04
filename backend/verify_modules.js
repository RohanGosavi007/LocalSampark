try {
  require('./src/repositories/spatial.repository');
  require('./src/middleware/zone.middleware');
  require('./src/middleware/territory.interceptor');
  require('./src/middleware/admin-partition.middleware');
  require('./src/validators/territory.validator');
  require('./src/services/cache.service');
  require('./src/services/radius-fallback.service');
  console.log('All Phase 1-6 modules loaded successfully!');
} catch(e) {
  console.error('LOAD ERROR:', e.message);
  console.error(e.stack);
}
