const express = require('express');
const router = express.Router();
const checkoutService = require('../services/checkout.service');
const { optionalAuth, authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne, withTransaction } = require('../../../config/database');
const crypto = require('crypto');

// Decoupled Checkout Endpoint
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];
    const { 
      deliveryAddress, 
      paymentMethod = 'COD',
      fulfillmentMethod = 'DELIVERY',
      shopId,
      items = [],
      totalAmount = 0
    } = req.body;

    // Handle Wallet Escrow Payment Method atomically
    if (paymentMethod === 'WALLET' && userId) {
      const orderRef = `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const orderId = crypto.randomUUID();

      await withTransaction(async (txClient) => {
        // 1. Deduct wallet balance
        const wallet = await txClient.queryOne('SELECT balance FROM user_wallets WHERE user_id = $1', [userId]);
        if (!wallet || wallet.balance < totalAmount) {
          throw { status: 400, message: 'Insufficient wallet balance for e-commerce checkout' };
        }

        await txClient.query('UPDATE user_wallets SET balance = balance - $1 WHERE user_id = $2', [totalAmount, userId]);
        await txClient.query(`
          INSERT INTO wallet_transactions (id, wallet_id, user_id, amount, transaction_type, reference_id, description)
          VALUES ($1, $2, $3, $4, 'debit', $5, 'Hyperlocal Order Payment')
        `, [crypto.randomUUID(), userId, userId, totalAmount, orderRef]);

        // 2. Insert Order
        await txClient.query(`
          INSERT INTO orders (id, order_number, user_id, shop_id, total_amount, payment_method, payment_status, status, delivery_address)
          VALUES ($1, $2, $3, $4, $5, 'WALLET', 'paid', 'confirmed', $6)
        `, [orderId, orderRef, userId, shopId || null, totalAmount, typeof deliveryAddress === 'string' ? deliveryAddress : JSON.stringify(deliveryAddress)]);

        // 3. Insert Line Items
        for (const item of items) {
          await txClient.query(`
            INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [crypto.randomUUID(), orderId, item.productId || item.id, item.name || 'Product', item.price || 0, item.quantity || 1]);
        }
      });

      return res.json({
        success: true,
        message: 'Order placed & paid via LocalWallet!',
        order: { id: orderId, order_number: orderRef, total_amount: totalAmount, status: 'confirmed' }
      });
    }

    // Fallback to legacy checkout process
    const result = await checkoutService.processCheckout({
      userId,
      sessionId,
      deliveryAddress,
      paymentMethod,
      fulfillmentMethod,
      shopId,
      app: req.app
    });

    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, ...error });
    }
    next(error);
  }
});

module.exports = router;
