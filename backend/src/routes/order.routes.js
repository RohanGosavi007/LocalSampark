const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, transaction } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { sendNewOrderNotification, sendOrderConfirmation } = require('../services/email.service');

// Checkout - Mock Payment Flow (or actual COD/Wallet)
router.post('/checkout', async (req, res, next) => {
  try {
    // Authenticate manually to allow guest checkouts for demo if needed
    const authHeader = req.headers.authorization;
    let userId = null;
    let userEmail = null;
    let userName = 'Guest User';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
        userId = decoded.userId;
        const user = await queryOne('SELECT email, full_name FROM users WHERE id = $1', [userId]);
        if (user) {
          userEmail = user.email;
          userName = user.full_name;
        }
      } catch (err) {
        // Ignore invalid token for demo
      }
    }

    const { items, totalAmount, deliveryAddress, pincode, paymentMethod } = req.body;

    if (!items || !items.length || !totalAmount || !deliveryAddress) {
      return res.status(400).json({ error: 'Missing required checkout fields' });
    }

    // Wrap in a transaction
    const result = await transaction(async (client) => {
      // 1. Create order record
      const orderId = crypto.randomUUID();
      
      // In a real app, orders belong to specific shops. Since cart can have mixed shops, 
      // we'll assign to the first item's shop, or a default dummy shop.
      let shopId = null;
      let shopEmail = null;
      const dummyShop = await client.query('SELECT id, owner_id FROM local_shops LIMIT 1');
      if (dummyShop.rows.length > 0) {
        shopId = dummyShop.rows[0].id;
        const owner = await client.query('SELECT email FROM users WHERE id = $1', [dummyShop.rows[0].owner_id]);
        if (owner.rows.length > 0) shopEmail = owner.rows[0].email;
      }

      const orderRes = await client.query(
        `INSERT INTO orders (id, user_id, shop_id, total_amount, status, delivery_type, payment_status)
         VALUES ($1, $2, $3, $4, 'pending', 'delivery', $5)
         RETURNING *`,
        [orderId, userId, shopId, totalAmount, paymentMethod === 'cod' ? 'pending' : 'paid']
      );
      const order = orderRes.rows[0];

      // 2. Add order items
      for (const item of items) {
        const itemId = crypto.randomUUID();
        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [itemId, orderId, item.id || null, item.quantity, item.price]
        );
      }

      // 3. Process Wallet Payment if chosen
      if (paymentMethod === 'wallet' && userId) {
        const wallet = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
        if (wallet.rows.length === 0 || parseFloat(wallet.rows[0].balance) < totalAmount) {
          throw new Error('Insufficient wallet balance');
        }
        
        await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
          [totalAmount, wallet.rows[0].id]
        );
        
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
           VALUES ($1, $2, 'debit', 'order_payment', 'completed')`,
          [wallet.rows[0].id, totalAmount]
        );
      }

      // Return the completed order
      return { order, shopEmail };
    });

    // Fire & Forget Emails
    if (userEmail) {
      sendOrderConfirmation({ email: userEmail, full_name: userName }, result.order, { name: 'LocalSampark Partner' }).catch(console.error);
    }
    if (result.shopEmail) {
      sendNewOrderNotification(result.shopEmail, result.order, { full_name: userName }).catch(console.error);
    }

    res.json({ success: true, order: result.order });
  } catch (error) {
    if (error.message === 'Insufficient wallet balance') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

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
