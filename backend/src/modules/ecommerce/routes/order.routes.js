const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, transaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { sendNewOrderNotification, sendOrderConfirmation } = require('../../core/services/email.service');


// Validate Coupon
router.post('/validate-coupon', authenticate, async (req, res, next) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code || !cartTotal) {
      return res.status(400).json({ error: 'Coupon code and cart total are required' });
    }

    // Mock validation logic
    const validCoupons = {
      'WELCOME50': { type: 'fixed', value: 50, minOrder: 200, message: '₹50 off on your first order!' },
      'FREEDELIVERY': { type: 'free_delivery', value: 0, minOrder: 150, message: 'Free delivery applied!' },
      'SAVE10': { type: 'percentage', value: 10, maxDiscount: 100, minOrder: 300, message: '10% off applied!' }
    };

    const coupon = validCoupons[code.toUpperCase()];

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }

    if (cartTotal < coupon.minOrder) {
      return res.status(400).json({ error: `Minimum order value for this coupon is ₹${coupon.minOrder}` });
    }

    let discount = 0;
    if (coupon.type === 'fixed') {
      discount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discount = (cartTotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'free_delivery') {
      // Handled on frontend
      discount = 0; 
    }

    res.json({
      success: true,
      coupon: {
        code: code.toUpperCase(),
        type: coupon.type,
        discount,
        message: coupon.message
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
