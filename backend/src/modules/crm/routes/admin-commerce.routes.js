const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const adminCommerceController = require('../controllers/admin-commerce.controller');

// Require authentication and administrative credentials for all commerce ops
router.use(authenticate, requireAdmin);

// A1: Admin Commerce KPI Dashboard
router.get('/kpis', adminCommerceController.getKpis);

// A2: Admin Store & Seller Governance
router.get('/shops', adminCommerceController.getShops);
router.put('/shops/:id/status', adminCommerceController.updateShopStatus);
router.put('/shops/:id/suspend', adminCommerceController.suspendShop);

// A3: Admin Catalog Moderation & Categories
router.get('/categories', adminCommerceController.getCategories);
router.post('/categories', adminCommerceController.createCategory);
router.put('/categories/:id', adminCommerceController.updateCategory);
router.delete('/categories/:id', adminCommerceController.deleteCategory);
router.get('/products/moderation', adminCommerceController.getModerationProducts);
router.put('/products/:id/moderation', adminCommerceController.moderateProduct);

// A4: Admin Order Operations & Emergency Interventions
router.get('/orders', adminCommerceController.getOrders);
router.get('/orders/sla-breaches', adminCommerceController.getSlaBreaches);
router.get('/orders/:id/timeline', adminCommerceController.getOrderTimeline);
router.post('/orders/:id/cancel', adminCommerceController.cancelOrder);
router.post('/orders/:id/refund', adminCommerceController.refundOrder);
router.post('/orders/:id/reassign', adminCommerceController.reassignOrder);

// A5: Admin Returns & Dispute Resolution Queue
router.get('/disputes', adminCommerceController.getDisputes);
router.put('/disputes/:id/resolve', adminCommerceController.resolveDispute);

// A6: Admin Payouts & Commission Configuration
router.get('/commission', adminCommerceController.getCommission);
router.get('/payouts', adminCommerceController.getPayouts);
router.put('/commission', adminCommerceController.updateCommission);
router.put('/shops/:id/commission', adminCommerceController.setShopCommission);

// A7: Admin Promotions, Campaigns & CMS
router.get('/coupons', adminCommerceController.getCoupons);
router.post('/coupons', adminCommerceController.createCoupon);
router.put('/coupons/:id', adminCommerceController.updateCoupon);
router.get('/banners', adminCommerceController.getBanners);
router.post('/banners', adminCommerceController.createBanner);
router.delete('/banners/:id', adminCommerceController.deleteBanner);

// A8: Admin RBAC & Audit Logs
router.get('/audit-logs', adminCommerceController.getAuditLogs);

// A9: Admin Serviceability Zones
router.get('/zones', adminCommerceController.getZones);
router.put('/zones/:id/toggle', adminCommerceController.toggleZone);
router.get('/zones/waitlist', adminCommerceController.getWaitlist);

// A10: Admin Delivery Fleet & Cash Reconciliation
router.get('/fleet/live', adminCommerceController.getLiveFleet);
router.get('/fleet/cash-summary', adminCommerceController.getFleetCashSummary);

// A11: Admin Grievance & Support Management
router.get('/grievances', adminCommerceController.getGrievances);
router.put('/grievances/:id', adminCommerceController.updateGrievance);

// A12: Admin Feature Flags & Vertical Kill Switches
router.get('/feature-flags', adminCommerceController.getFeatureFlags);
router.put('/feature-flags', adminCommerceController.updateFeatureFlags);

// A13: Admin Financial & Tax Report Exports
router.get('/reports/export', adminCommerceController.exportReports);

// D10: refunds paid by hand while the wallet is off.
router.get('/refund-payouts', adminCommerceController.getRefundPayouts);
router.post('/refund-payouts/:id/paid', adminCommerceController.markRefundPaid);

// C11: reported reviews, and the decision on each.
router.get('/review-reports', adminCommerceController.getReviewReports);
router.post('/review-reports/:reviewId/moderate', adminCommerceController.moderateReview);

// A14: Admin Broadcast Notifications
router.post('/broadcasts', adminCommerceController.broadcastPush);
router.get('/broadcasts', adminCommerceController.getBroadcasts);

module.exports = router;
