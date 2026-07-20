const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/database');
const { optionalAuth } = require('../middleware/auth.middleware');

const crypto = require('crypto');
const Razorpay = require('razorpay');
const Stripe = require('stripe');
const { Cashfree } = require('cashfree-pg');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID || 'mock_id';
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET || 'mock_secret';
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];
    const { 
      deliveryAddress, 
      paymentMethod = 'COD',
      fulfillmentMethod = 'DELIVERY',
      shopId
    } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    const shop = await queryOne('SELECT category_id FROM local_shops WHERE id = ?', [shopId]);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const category = await queryOne('SELECT allowed_payment_methods, allowed_fulfillment_methods FROM shop_categories WHERE id = ?', [shop.category_id]);
    if (category) {
      const allowedPayments = (category.allowed_payment_methods || 'RAZORPAY,STRIPE,CASHFREE,COD').split(',');
      const allowedFulfillments = (category.allowed_fulfillment_methods || 'DELIVERY,SELF_PICKUP').split(',');

      if (!allowedPayments.includes(paymentMethod)) {
        return res.status(400).json({ error: `Payment method ${paymentMethod} is not allowed for this category` });
      }
      if (!allowedFulfillments.includes(fulfillmentMethod)) {
        return res.status(400).json({ error: `Fulfillment method ${fulfillmentMethod} is not allowed for this category` });
      }
    }

    let cartQuery = `
      SELECT c.*, p.price as product_price, p.shop_id, p.inventory_count, p.track_inventory 
      FROM cart_items c
      JOIN shop_products p ON c.product_id = p.id
      WHERE c.product_id IN (SELECT id FROM shop_products WHERE shop_id = ?) AND `;
    
    let params = [shopId];
    if (userId) {
      cartQuery += `c.user_id = ?`;
      params.push(userId);
    } else {
      cartQuery += `c.session_id = ?`;
      params.push(sessionId);
    }

    const cartItems = await query(cartQuery, params);
    if (!cartItems || (cartItems.rows || cartItems).length === 0) {
      return res.status(400).json({ error: 'Cart is empty for this shop' });
    }

    const items = cartItems.rows || cartItems;

    let outOfStockItems = [];
    let totalAmount = 0;
    items.forEach(item => {
      if (item.track_inventory === 1 && item.inventory_count < item.quantity) {
        outOfStockItems.push({ productId: item.product_id, requested: item.quantity, available: item.inventory_count });
      }
      totalAmount += item.quantity * item.product_price;
    });

    if (outOfStockItems.length > 0) {
      return res.status(400).json({ error: 'Some items are out of stock', outOfStockItems });
    }

    const deliveryFee = fulfillmentMethod === 'DELIVERY' ? 40 : 0;
    const platformFee = 10;
    const finalAmount = totalAmount + deliveryFee + platformFee;

    const insertOrderParams = [
      userId || null, 
      shopId, 
      'PENDING', 
      totalAmount, 
      deliveryFee, 
      platformFee, 
      0, 
      paymentMethod,
      'PENDING',
      fulfillmentMethod
    ];
    
    if (deliveryAddress && deliveryAddress.lat && deliveryAddress.lng) {
      insertOrderParams.push(deliveryAddress.lat);
      insertOrderParams.push(deliveryAddress.lng);
    } else {
      insertOrderParams.push(null);
      insertOrderParams.push(null);
    }

    const orderQuery = `
      INSERT INTO orders 
      (user_id, shop_id, status, total_amount, delivery_fee, platform_fee, discount, payment_method, payment_status, fulfillment_method, delivery_lat, delivery_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const orderRes = await query(orderQuery, insertOrderParams);
    const orderId = orderRes.lastID;

    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_buy) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.product_price]
      );
      if (item.track_inventory === 1) {
        await query('UPDATE shop_products SET inventory_count = inventory_count - ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }

    await query('INSERT INTO order_tracking (order_id) VALUES (?)', [orderId]);

    if (userId) {
      await query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    } else {
      await query('DELETE FROM cart_items WHERE session_id = ?', [sessionId]);
    }

    let paymentData = null;
    if (paymentMethod === 'RAZORPAY') {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: Math.round(finalAmount * 100),
          currency: 'INR',
          receipt: `receipt_order_${orderId}`
        });
        paymentData = rzpOrder;
      } catch (err) {
        console.warn('Razorpay fallback', err);
        paymentData = { id: 'mock_rzp_' + Date.now(), amount: finalAmount * 100, currency: 'INR' };
      }
    } else if (paymentMethod === 'STRIPE') {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(finalAmount * 100),
          currency: 'inr',
          metadata: { orderId: orderId.toString() }
        });
        paymentData = { clientSecret: paymentIntent.client_secret, orderId };
      } catch (err) {
        console.warn('Stripe fallback', err);
        paymentData = { clientSecret: 'mock_stripe_secret_' + Date.now(), orderId };
      }
    } else if (paymentMethod === 'CASHFREE') {
      try {
        const request = {
          order_amount: finalAmount,
          order_currency: "INR",
          order_id: `order_${orderId}_${Date.now()}`,
          customer_details: {
            customer_id: userId ? userId.toString() : 'guest',
            customer_phone: "9999999999"
          },
          order_meta: {
            return_url: "https://localsampark.in/order-tracking?id=" + orderId
          }
        };
        const response = await Cashfree.PGCreateOrder("2023-08-01", request);
        paymentData = response.data;
      } catch (err) {
        console.warn('Cashfree fallback', err);
        paymentData = { payment_session_id: 'mock_cashfree_' + Date.now(), orderId };
      }
    }

    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      supabaseRealtime.broadcast(`shop:${shopId}`, 'order:new', {
        orderId,
        totalAmount: finalAmount,
        paymentMethod,
        fulfillmentMethod,
        status: 'PENDING'
      });
    }

    res.json({
      success: true,
      order: {
        id: orderId,
        totalAmount: finalAmount,
        paymentMethod,
        fulfillmentMethod,
        status: 'PENDING'
      },
      paymentData
    });

  } catch (error) {
    console.error('Checkout POST Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process checkout' });
  }
});

// Verify Razorpay Payment Signature
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification details' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment verification failed: Invalid signature' });
    }

    // Update order status
    await query('UPDATE orders SET payment_status = ? WHERE id = ?', ['PAID', orderId]);

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Checkout Verify Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

module.exports = router;
