const returnService = require('../services/return.service');
const { queryOne } = require('../../../config/database');
const { isFullAdmin } = require('../../../../../packages/shared/src/roles');

const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'territory_admin', 'franchise_owner', 'area_agent', 'moderator'];

const isAdminReviewer = (user) => {
  if (!user) return false;
  if (isFullAdmin(user.role) || user.isSuperAdmin) return true;
  return ADMIN_ROLES.includes(String(user.role || '').toLowerCase());
};

const submitReturn = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { returnType, reason, reasonCode, items, evidenceUrls, refundUpi } = req.body || {};
    const userId = req.user.id || req.user.userId;

    const result = await returnService.submitReturnRequest({
      orderId, userId, returnType, reason, reasonCode, items, evidenceUrls, refundUpi,
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

/**
 * The review queue. An administrator sees every shop's returns; a seller sees
 * only their own shop's (C10: seller and admin review). Anyone else is refused.
 */
const getPendingReturns = async (req, res, next) => {
  try {
    const { status, shopId, limit, offset } = req.query;
    let scope = shopId;
    if (!isAdminReviewer(req.user)) {
      const shop = await queryOne('SELECT id FROM local_shops WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1', [req.user.id]);
      if (!shop) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to access returns review queue' });
      }
      scope = shop.id;
    }
    const list = await returnService.getPendingReturns({ status, shopId: scope, limit, offset });
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

/** GET /orders/returns/mine — the customer's own returns and where each stands. */
const getMyReturns = async (req, res, next) => {
  try {
    res.json({ success: true, data: await returnService.getCustomerReturns(req.user.id || req.user.userId), reasons: returnService.REASON_CODES });
  } catch (error) {
    next(error);
  }
};

const verifyReturn = async (req, res, next) => {
  try {
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
    if (error.name === 'ReturnError') {
      return res.status(error.status).json({ success: false, error: `Forbidden: ${error.message}` });
    }
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
  getMyReturns,
  verifyReturn
};
