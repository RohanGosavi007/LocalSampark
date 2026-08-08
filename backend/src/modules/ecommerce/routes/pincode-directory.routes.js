// ═══════════════════════════════════════════════════════════════════════
// Pincode Directory Routes
// ═══════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { getShopsByPincode } = require('../../../../controllers/pincode-directory.controller');

// GET /api/shops/pincode/:pincode
router.get('/:pincode', getShopsByPincode);

module.exports = router;
