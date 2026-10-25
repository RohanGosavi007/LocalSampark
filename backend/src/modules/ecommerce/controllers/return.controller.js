const returnService = require('../services/return.service');
const { isFullAdmin } = require('../../../../../packages/shared/src/roles');

const isAuthorizedReviewer = (user) => {
  if (!user) return false;
  if (isFullAdmin(user.role) || user.isSuperAdmin) return true;
  const role = String(user.role || '').toLowerCase();
  return ['super_admin', 'superadmin', 'admin', 'territory_admin', 'franchise_owner', 'area_agent', 'moderator'].includes(role);
};

const submitReturn = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { returnType, reason, items, evidenceUrls } = req.body || {};
    const userId = req.user.id || req.user.userId;

    const result = await returnService.submitReturnRequest({
      orderId,
      userId,
      returnType,
      reason,
      items,
      evidenceUrls
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('already') || error.message.includes('delivered') || error.message.includes('required') || error.message.includes('own orders')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

const getPendingReturns = async (req, res, next) => {
  try {
    if (!isAuthorizedReviewer(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to access returns review queue' });
    }

    const { status, shopId, limit, offset } = req.query;
    const list = await returnService.getPendingReturns({ status, shopId, limit, offset });
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

const verifyReturn = async (req, res, next) => {
  try {
    if (!isAuthorizedReviewer(req.user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to verify returns' });
    }

    const { returnId } = req.params;
    const { action, rejectionReason, notes } = req.body || {};

    const result = await returnService.verifyAndProcessReturn({
      returnId,
      adminUser: req.user,
      action,
      rejectionReason,
      notes
    });

    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message.includes('mandatory') || error.message.includes('action must') || error.message.includes('already been')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    next(error);
  }
};

module.exports = {
  submitReturn,
  getPendingReturns,
  verifyReturn
};
