const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

/**
 * Records an immutable administrative action into admin_audit_log (A8).
 */
async function recordAudit(req, { action, targetType = 'system', targetId = null, details = {} }) {
  try {
    const auditId = crypto.randomUUID();
    const adminId = req.user?.id || req.user?.userId || null;
    const adminName = req.user?.fullName || req.user?.name || req.user?.email || 'Admin';
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers ? req.headers['user-agent'] : 'system';
    const detailsJson = typeof details === 'string' ? details : JSON.stringify(details);

    await query(
      `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, target_type, target_id, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${NOW})`,
      [auditId, adminId, adminName, action, targetType, targetId ? String(targetId) : null, detailsJson, ipAddress, userAgent]
    );
    return auditId;
  } catch (err) {
    logger.warn(`Failed to record admin audit log: ${err.message}`);
    return null;
  }
}

module.exports = {
  recordAudit,
};
