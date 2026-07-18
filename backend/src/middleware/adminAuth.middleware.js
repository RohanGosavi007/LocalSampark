const { queryOne } = require('../config/database');

const adminIpAllowlist = async (req, res, next) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    // Check database to see if we have any active whitelisted IPs
    const allowedIpsCount = await queryOne('SELECT COUNT(*) as count FROM admin_ip_allowlist WHERE is_active = 1');
    if (allowedIpsCount && parseInt(allowedIpsCount.count) > 0) {
      const isAllowed = await queryOne('SELECT * FROM admin_ip_allowlist WHERE ip_address = $1 AND is_active = 1', [clientIp]);
      const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('::ffff:127.0.0.1');
      if (!isAllowed && !isLocal) {
        return res.status(403).json({ error: `Access denied from IP address ${clientIp}` });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminIpAllowlist
};
