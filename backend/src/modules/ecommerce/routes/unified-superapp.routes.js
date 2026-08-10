// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Unified Super-App Routes â€” Phase 3 API Contracts
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const express = require('express');
const router = express.Router();
const {
  getShopById,
  processCheckout,
  processBooking,
  updateOrderStatus,
} = require('../controllers/unified-superapp.controller');

// â”€â”€ GET /api/shops/:id (Unified dynamic payload for Web & Mobile)
router.get('/shops/:id', getShopById);

// â”€â”€ POST /api/checkout (Product Order Flow)
router.post('/checkout', processCheckout);

// â”€â”€ POST /api/book (Service Appointment Flow)
router.post('/book', processBooking);

// â”€â”€ PATCH /api/orders/:id/status (Vendor/DMS State Machine Transition)
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;
