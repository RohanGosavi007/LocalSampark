const express = require('express');
const router = express.Router();
const apiCache = require('../middleware/cache.middleware');
const { authLimiter, paymentLimiter, uploadLimiter, adminLimiter } = require('../middleware/rateLimit.middleware');

// ─── CORE DOMAIN ──────────────────────────────────────────
router.use('/auth', authLimiter, require('../modules/core/routes/auth.routes'));
router.use('/users', require('../modules/core/routes/user.routes'));
router.use('/users/addresses', require('../modules/ecommerce/routes/addresses.routes')); // Legacy overlap
router.use('/chatbot', require('../modules/core/routes/chatbot.routes'));
router.use('/loyalty', require('../modules/core/routes/loyalty.routes'));
router.use('/notifications', require('../modules/core/routes/notification.routes'));
router.use('/sos', require('../modules/core/routes/sos.routes'));
router.use('/zones', apiCache(3600), require('../modules/core/routes/zone.routes'));
router.use('/user-zones', require('../modules/core/routes/user_zone.routes'));
router.use('/rewards', require('../modules/core/routes/rewards.routes'));
router.use('/referral', require('../modules/core/routes/referral.routes'));
router.use('/upload', uploadLimiter, require('../modules/core/routes/upload.routes'));
router.use('/settings', require('../modules/core/routes/settings.routes'));
router.use('/webhooks', require('../modules/core/routes/webhooks.routes'));
router.use('/token-queue', require('../modules/core/routes/token-queue.routes'));

// ─── COMMUNITY DOMAIN ─────────────────────────────────────
router.use('/feed', apiCache(300), require('../modules/community/routes/feed.routes'));
router.use('/chat', require('../modules/community/routes/chat.routes'));
router.use('/societies', require('../modules/community/routes/society.routes'));
// The web society page calls /society/notices, so the same router is also
// reachable in the singular.
router.use('/society', require('../modules/community/routes/society.routes'));
router.use('/events', apiCache(3600), require('../modules/community/routes/event.routes'));
router.use('/pets', require('../modules/community/routes/pet.routes'));
router.use('/stories', require('../modules/community/routes/story.routes'));
router.use('/society-admin', require('../modules/community/routes/society-admin.routes'));
router.use('/townsquare', require('../modules/community/routes/townsquare.routes'));
router.use('/scrap', require('../modules/community/routes/scrap.routes'));
router.use('/community-hub', apiCache(300), require('../modules/community/routes/community_hub.routes'));
router.use('/volunteer', require('../modules/community/routes/volunteer.routes'));
router.use('/donations', require('../modules/community/routes/donations.routes'));
router.use('/society-management', require('../modules/community/routes/society-visitor.routes'));

// NEW Phase 2-12 society routes (To be implemented)
router.use('/society-preapproval', require('../modules/community/routes/visitor-preapproval.routes'));
router.use('/society-billing', require('../modules/community/routes/billing-engine.routes'));
router.use('/society-guard', require('../modules/community/routes/guard-operations.routes'));
router.use('/society-move', require('../modules/community/routes/move-management.routes'));
router.use('/society-erp', require('../modules/community/routes/society-erp.routes'));
router.use('/society-forum', require('../modules/community/routes/community-forum.routes'));
router.use('/society-messaging', require('../modules/community/routes/private-messaging.routes'));
router.use('/society-shifts', require('../modules/community/routes/guard-shifts.routes'));
router.use('/society-compliance', require('../modules/community/routes/society-compliance.routes'));
router.use('/society-analytics', require('../modules/community/routes/society-analytics.routes'));
router.use('/society-integration', require('../modules/community/routes/integration.routes'));

// ─── UNIFIED SUPER-APP CONTRACTS (Phase 3 & Hyperlocal Optimization) ────────────────
router.use('/shops/pincode', require('../modules/ecommerce/routes/pincode-directory.routes'));

router.use('/shops', (req, res, next) => {
  if (req.path.startsWith('/admin') || req.headers.authorization || req.method !== 'GET') {
    return next();
  }
  return apiCache(900)(req, res, next);
}, require('../modules/ecommerce/routes/shop.routes'));

router.use('/', require('../modules/ecommerce/routes/unified-superapp.routes'));
router.use('/marketplace', apiCache(600), require('../modules/ecommerce/routes/marketplace.routes'));
// The mobile marketplace screen reads a flat /products list.
router.use('/products', apiCache(600), require('../modules/ecommerce/routes/marketplace.routes'));
router.use('/dashboard', require('../modules/core/routes/dashboard.routes'));
router.use('/payments', paymentLimiter, require('../modules/ecommerce/routes/payment.routes'));
router.use('/subscriptions', require('../modules/ecommerce/routes/subscription.routes'));
router.use('/bills', require('../modules/ecommerce/routes/bills.routes'));
router.use('/wallet', paymentLimiter, require('../modules/ecommerce/routes/wallet.routes'));
router.use('/premium', require('../modules/ecommerce/routes/premium.routes'));
router.use('/orders', require('../modules/ecommerce/routes/order.routes'));
router.use('/cart', require('../modules/ecommerce/routes/cart.routes'));
router.use('/checkout', paymentLimiter, require('../modules/ecommerce/routes/checkout.routes'));
router.use('/addresses', require('../modules/ecommerce/routes/addresses.routes'));
router.use('/group-buy', require('../modules/ecommerce/routes/group-buying.routes'));
router.use('/trust-reviews', require('../modules/ecommerce/routes/trust-reviews.routes'));
router.use('/categories', require('../modules/ecommerce/routes/category-matrix.routes'));
router.use('/universal-catalog', require('./universal-catalog.routes'));
router.use('/universal-orders', require('./universal-order.routes'));

// ─── SERVICES DOMAIN ──────────────────────────────────────
router.use('/jobs', require('../modules/services/routes/jobs.routes'));
router.use('/job-services', require('../modules/services/routes/job.routes'));
router.use('/properties', require('../modules/services/routes/properties.routes'));
router.use('/delivery', require('../modules/services/routes/delivery.routes'));
router.use('/logistics/riders', require('../modules/logistics/routes/rider.routes'));
router.use('/logistics/agents', require('../modules/logistics/routes/agents.routes'));
router.use('/health-services', apiCache(600), require('../modules/services/routes/health.routes'));
router.use('/rental', require('../modules/services/routes/rental.routes'));
router.use('/carpool', require('../modules/services/routes/carpool.routes'));
router.use('/medical', require('../modules/services/routes/medical.routes'));
router.use('/equipment', require('../modules/services/routes/equipment.routes'));
router.use('/chef', require('../modules/services/routes/chef.routes'));
router.use('/tracking', require('../modules/services/routes/tracking.routes'));
router.use('/services', require('../modules/services/routes/services.routes'));
router.use('/care', require('../modules/services/routes/care.routes'));
router.use('/job-cards', require('../modules/services/routes/job-cards.routes'));
router.use('/home-services', require('../modules/services/routes/home-services.routes'));
router.use('/community', require('../modules/services/routes/community.routes'));
router.use('/multilingual', require('../modules/services/routes/multilingual.routes'));

// ─── PHASE A & B: ADVANCED TRI-CATEGORY FEATURES ────────────
router.use('/carpool', require('../modules/services/routes/advanced.routes'));
router.use('/marketplace', require('../modules/services/routes/advanced.routes'));
router.use('/jobs', require('../modules/services/routes/advanced.routes'));
router.use('/', require('../modules/services/routes/advanced.routes'));

router.use('/carpool', require('../modules/services/routes/advanced-b.routes'));
router.use('/marketplace', require('../modules/services/routes/advanced-b.routes'));
router.use('/jobs', require('../modules/services/routes/advanced-b.routes'));
router.use('/', require('../modules/services/routes/advanced-b.routes'));

// ─── 10x NEW: SHOP ANALYTICS & VENDOR MANAGEMENT ─────────
router.use('/shops', require('../modules/ecommerce/routes/shop-analytics.routes'));
router.use('/shops', require('../modules/ecommerce/routes/payout.routes'));
router.use('/shops', require('../modules/ecommerce/routes/vendor-kyc.routes'));

// ─── 10x NEW: PRIVACY & DPDP COMPLIANCE ──────────────────
router.use('/users', require('../modules/core/routes/privacy.routes'));
router.use('/', require('../modules/core/routes/privacy.routes')); // /privacy-policy is root-level

// ─── 10x NEW: OFFLINE SYNC ───────────────────────────────
router.use('/sync', require('../modules/core/routes/sync.routes'));

// ─── CRM & ADMIN DOMAIN ───────────────────────────────────
router.use('/finance', adminLimiter, require('../modules/crm/routes/finance.routes'));
router.use('/admin', adminLimiter, require('../modules/crm/routes/admin.routes'));
router.use('/disputes', require('../modules/crm/routes/disputes.routes'));
router.use('/franchise', require('../modules/crm/routes/franchise.routes'));
router.use('/crm', adminLimiter, require('../modules/crm/routes/crm.routes'));
router.use('/commissions', require('../modules/crm/routes/commission.routes'));
router.use('/admin-auth', authLimiter, require('../modules/crm/routes/admin-auth.routes'));
router.use('/territory', require('../modules/crm/routes/territory.routes'));
router.use('/earnings', require('../modules/crm/routes/earnings.routes'));
router.use('/engagement', require('../modules/crm/routes/engagement.routes'));
router.use('/fleet-assets', require('../modules/crm/routes/fleet-assets.routes'));
router.use('/leads-crm', require('../modules/crm/routes/leads-crm.routes'));
router.use('/franchise-intelligence', require('../modules/crm/routes/franchise-intelligence.routes'));
router.use('/campaigns', require('../modules/crm/routes/campaigns.routes'));
router.use('/saas', require('../modules/crm/routes/saas.routes'));
router.use('/gtm', require('../modules/crm/routes/gtm.routes'));
router.use('/analytics', require('../modules/crm/routes/ai-analytics.routes'));

// ─── 10x NEW: FRAUD ADMIN PANEL ──────────────────────────
router.use('/admin/fraud', adminLimiter, require('../modules/crm/routes/fraud.routes'));
router.use('/admin/payouts', adminLimiter, require('../modules/ecommerce/routes/payout.routes'));

router.use('/test-runner', require('./test-runner.routes'));

module.exports = router;
