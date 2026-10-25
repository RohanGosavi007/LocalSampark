/**
 * scripts/audit/migrate-logging.mjs
 *
 * Migrates raw console.log calls in backend/src to Winston logger.info.
 * L9 and POL-07 resolution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const targetFiles = [
  'backend/src/config/database.sqlite.js',
  'backend/src/config/envValidator.js',
  'backend/src/config/firebase.js',
  'backend/src/create_messages_table.js',
  'backend/src/gateways/tracking.gateway.js',
  'backend/src/jobs/amc-expiry-alert.job.js',
  'backend/src/jobs/billing-automation.job.js',
  'backend/src/jobs/complaint-escalation.job.js',
  'backend/src/jobs/lease-expiry-reminder.job.js',
  'backend/src/jobs/overstay-monitor.job.js',
  'backend/src/middleware/audit.middleware.js',
  'backend/src/modules/community/services/face-recognition.service.js',
  'backend/src/modules/community/services/msg91.service.js',
  'backend/src/modules/community/services/notification-fallback.service.js',
  'backend/src/modules/community/services/police-verification.service.js',
  'backend/src/modules/community/services/whatsapp.service.js',
  'backend/src/modules/core/controllers/push.controller.js',
  'backend/src/modules/core/routes/auth.routes.js',
  'backend/src/modules/core/services/email.service.js',
  'backend/src/modules/core/services/firebase.service.js',
  'backend/src/modules/core/services/sms.service.js',
  'backend/src/modules/crm/routes/saas.routes.js',
  'backend/src/modules/services/routes/health.routes.js',
  'backend/src/services/audit.logger.js',
  'backend/src/services/cache.service.js',
  'backend/src/services/search.engine.js',
  'backend/src/sockets/carpoolSocket.js',
  'backend/src/sockets/index.js',
  'backend/src/sockets/inventorySocket.js',
  'backend/src/workers/eventWorker.js',
  'backend/src/workers/paymentWorker.js',
  'backend/src/workers/search-sync.worker.js'
];

let migratedCount = 0;

for (const rel of targetFiles) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  let content = fs.readFileSync(full, 'utf8');
  if (!content.includes('console.log(')) continue;

  const loggerRel = path.relative(path.dirname(full), path.join(ROOT, 'backend/src/config/logger.js')).replace(/\\/g, '/');
  const importPath = loggerRel.startsWith('.') ? loggerRel : './' + loggerRel;

  const hasLogger = /const\s+.*logger.*=\s*require/i.test(content) || /let\s+.*logger.*=\s*require/i.test(content);
  if (!hasLogger) {
    content = `const logger = require('${importPath}');\n` + content;
  }

  content = content.replace(/console\.log\(/g, 'logger.info(');
  fs.writeFileSync(full, content, 'utf8');
  console.log(`Migrated console.log in: ${rel}`);
  migratedCount++;
}

console.log(`\n✅ Successfully migrated logging in ${migratedCount} files.`);
