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

// Every state-changing route below was registered with no auth middleware at
// all, and the handlers took the acting user from the request body:
//
//   POST  /checkout          -> order placed against req.body.userId
//   POST  /book              -> fell back to the first CUSTOMER row in the table
//   PATCH /orders/:id/status -> any order to any status, including DELIVERED,
//                               which also sets paymentStatus = 'PAID'
//
// The same operations are protected elsewhere (shop.routes.js requires
// authenticate + requireShopOwner for an order status change), so these were
// unguarded duplicates rather than a deliberate public contract.
const { authenticate } = require('../../../middleware/auth.middleware');

// GET /shops/:id was registered here as well as in shop.routes.js. routes/index.js
// mounts /shops first, so Express has always resolved it there and this
// registration never matched. It is commented out rather than left in place: its
// handler ran on Prisma models the migrations do not create, so a future change
// to the mount order would have turned a working endpoint into a failing one.
// router.get('/shops/:id', getShopById);

// â”€â”€ POST /api/checkout (Product Order Flow)
router.post('/checkout', authenticate, processCheckout);

// â”€â”€ POST /api/book (Service Appointment Flow)
router.post('/book', authenticate, processBooking);

// â”€â”€ PATCH /api/orders/:id/status (Vendor/DMS State Machine Transition)
// NOTE: authenticate only proves *who* is calling. Restricting the transition
// to the owning vendor, the assigned rider or an admin is still outstanding —
// see GO-LIVE.md. Any signed-in user can currently move any order.
router.patch('/orders/:id/status', authenticate, updateOrderStatus);

module.exports = router;
