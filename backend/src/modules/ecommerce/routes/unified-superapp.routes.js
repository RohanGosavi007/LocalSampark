// ═══════════════════════════════════════════════════════════════════════
// Unified Super-App Routes — Phase 3 API Contracts
// ═══════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const {
  getShopById,
  processCheckout,
  processBooking,
  updateOrderStatus,
} = require('../controllers/unified-superapp.controller');

// ── GET /api/shops/:id (Unified dynamic payload for Web & Mobile)
router.get('/shops/:id', getShopById);

// ── POST /api/checkout (Product Order Flow)
router.post('/checkout', processCheckout);

// ── POST /api/book (Service Appointment Flow)
router.post('/book', processBooking);

// ── PATCH /api/orders/:id/status (Vendor/DMS State Machine Transition)
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;
