const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, transaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { paymentLimiter } = require('../../../middleware/rateLimit.middleware');

router.post('/wallet/add', authenticate, paymentLimiter, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const tx = await transaction(async (client) => {
      const walletRes = await client.query(
        'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING *',
        [amount, req.user.id]
      );
      const wallet = walletRes.rows[0];

      const transactionRes = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
         VALUES ($1, $2, 'credit', 'wallet_load', 'completed')
         RETURNING *`,
        [wallet.id, amount]
      );

      return { wallet, transaction: transactionRes.rows[0] };
    });

    res.json(tx);
  } catch (error) {
    next(error);
  }
});

router.post('/create-order', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    res.json({
      id: `rzp_test_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount * 100,
      currency: 'INR',
      status: 'created'
    });
  } catch (error) {
    next(error);
  }
});

// Verification API route
router.post('/verify', authenticate, async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Razorpay parameters are required' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_dev';
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    next(error);
  }
});

// Fetch invoices / billing statements
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const wallet = await queryOne('SELECT id FROM wallets WHERE user_id = $1', [req.user.id]);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const statements = await query(
      `SELECT * FROM wallet_transactions 
       WHERE wallet_id = $1 
       ORDER BY created_at DESC`,
      [wallet.id]
    );

    res.json(statements);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
