const { query, queryOne, withTransaction } = require('../../../config/database');
const { calculateBreakdown } = require('../../../services/PricingEngine');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Stripe = require('stripe');
const { Cashfree } = require('cashfree-pg');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID || 'mock_id';
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET || 'mock_secret';

class CheckoutService {
  async processCheckout({ userId, sessionId, deliveryAddress, paymentMethod = 'COD', fulfillmentMethod = 'DELIVERY', shopId, app }) {
    if (!userId && !sessionId) {
      throw { status: 400, message: 'User ID or Session ID is required' };
    }
    if (!shopId) {
      throw { status: 400, message: 'Shop ID is required' };
    }

    const shop = await queryOne('SELECT category_id, region_id, pincode FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) {
      throw { status: 404, message: 'Shop not found' };
    }

    const category = await queryOne('SELECT allowed_payment_methods, allowed_fulfillment_methods FROM shop_categories WHERE id = $1', [shop.category_id]);
    if (category) {
      const allowedPayments = (category.allowed_payment_methods || 'RAZORPAY,STRIPE,CASHFREE,COD').split(',');
      const allowedFulfillments = (category.allowed_fulfillment_methods || 'DELIVERY,SELF_PICKUP').split(',');

      if (!allowedPayments.includes(paymentMethod)) {
        throw { status: 400, message: `Payment method ${paymentMethod} is not allowed for this category` };
      }
      if (!allowedFulfillments.includes(fulfillmentMethod)) {
        throw { status: 400, message: `Fulfillment method ${fulfillmentMethod} is not allowed for this category` };
      }
    }

    let cartQuery = `
      SELECT c.*, p.price as product_price, p.shop_id, p.inventory_count, p.track_inventory 
      FROM cart_items c
      JOIN shop_products p ON c.product_id = p.id
      WHERE c.product_id IN (SELECT id FROM shop_products WHERE shop_id = $1) AND `;
    
    let params = [shopId];
    if (userId) {
      cartQuery += `c.user_id = $2`;
      params.push(userId);
    } else {
      cartQuery += `c.session_id = $2`;
      params.push(sessionId);
    }

    const cartItems = await query(cartQuery, params);
    const items = cartItems.rows || cartItems;
    if (!items || items.length === 0) {
      throw { status: 400, message: 'Cart is empty for this shop' };
    }

    let outOfStockItems = [];
    let totalAmount = 0;
    items.forEach(item => {
      if (item.track_inventory === 1 && item.inventory_count < item.quantity) {
        outOfStockItems.push({ productId: item.product_id, requested: item.quantity, available: item.inventory_count });
      }
      totalAmount += item.quantity * item.product_price;
    });

    if (outOfStockItems.length > 0) {
      throw { status: 400, message: 'Some items are out of stock', outOfStockItems };
    }

    const deliveryFee = fulfillmentMethod === 'DELIVERY' ? 40 : 0;
    
    let pricingDetails;
    try {
      pricingDetails = await calculateBreakdown({ 
        shopId, 
        cartTotal: totalAmount, 
        pincode: deliveryAddress ? deliveryAddress.pincode : shop.pincode
      });
    } catch (pricingError) {
      console.error('PricingEngine Error:', pricingError);
      throw { status: 500, message: 'Failed to calculate pricing and commissions' };
    }

    const { platformCommission, franchiseCommission, vendorNetEarnings, franchiseId } = pricingDetails;
    const finalAmount = totalAmount + deliveryFee + platformCommission;

    const depletedProducts = [];

    // Execute order creation and ledger updates atomically
    const orderId = await withTransaction(async (dbClient) => {
      const insertOrderParams = [
        userId || null, 
        shopId, 
        'PENDING', 
        totalAmount, 
        deliveryFee, 
        platformCommission, 
        0, 
        paymentMethod,
        'PENDING',
        fulfillmentMethod,
        deliveryAddress?.lat || null,
        deliveryAddress?.lng || null
      ];

      const orderQuery = `
        INSERT INTO orders 
        (user_id, shop_id, status, total_amount, delivery_fee, platform_fee, discount, payment_method, payment_status, fulfillment_method, delivery_lat, delivery_lng)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;
      const orderRes = await dbClient.query(orderQuery, insertOrderParams);
      // Postgres reports the new key through RETURNING; lastID is SQLite-only
      // and was silently undefined here, so order_items and order_tracking were
      // being written against a null order id.
      const insertedOrderId = (orderRes.rows && orderRes.rows[0] && orderRes.rows[0].id) ?? orderRes.lastID;
      if (!insertedOrderId) {
        throw new Error('Order insert did not return an id');
      }

      for (const item of items) {
        await dbClient.query('INSERT INTO order_items (order_id, product_id, quantity, price_at_buy) VALUES ($1, $2, $3, $4)',
          [insertedOrderId, item.product_id, item.quantity, item.product_price]
        );
        if (item.track_inventory === 1) {
          await dbClient.query('UPDATE shop_products SET inventory_count = inventory_count - $1 WHERE id = $2', [item.quantity, item.product_id]);
          const newCount = item.inventory_count - item.quantity;
          depletedProducts.push({ productId: item.product_id, newCount });
        }
      }

      await dbClient.query('INSERT INTO order_tracking (order_id) VALUES ($1)', [insertedOrderId]);

      // ─── STRICT APPEND-ONLY WALLET LEDGER ───
      // 1. Vendor Escrow Hold
      await dbClient.query('INSERT INTO wallet_transactions (id, wallet_id, amount, transaction_type, purpose, status) VALUES ($1, (SELECT id FROM wallets WHERE shop_id = $2 LIMIT 1), $3, $4, $5, $6)',
        [crypto.randomUUID(), shopId, vendorNetEarnings, 'credit', 'order_payment', 'pending']
      );

      // 2. Platform Revenue
      const netPlatformRevenue = platformCommission - franchiseCommission;
      await dbClient.query('INSERT INTO revenue_transactions (id, type, gross_amount, platform_share, franchise_share, region_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [crypto.randomUUID(), 'order_commission', platformCommission, netPlatformRevenue, franchiseCommission, shop.region_id, 'completed']
      );

      // 3. Franchise Share
      if (franchiseCommission > 0 && franchiseId) {
        await dbClient.query('INSERT INTO wallet_transactions (id, wallet_id, amount, transaction_type, purpose, status) VALUES ($1, (SELECT id FROM wallets WHERE franchise_id = $2 LIMIT 1), $3, $4, $5, $6)',
          [crypto.randomUUID(), franchiseId, franchiseCommission, 'credit', 'order_payment', 'pending']
        );
        await dbClient.query('INSERT INTO franchise_payouts (id, franchise_partner_id, commission_earned, status) VALUES ($1, $2, $3, $4)',
          [crypto.randomUUID(), franchiseId, franchiseCommission, 'pending']
        );
      }
      
      return insertedOrderId;
    });

    if (userId) {
      await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else {
      await query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
    }

    // Payment Gateway Strategy Integration
    let paymentData = await this.initiatePaymentGateway({ paymentMethod, finalAmount, orderId, userId });

    // ── Real-Time Socket Event Emission for Stock Depletion ──
    const io = app?.get?.('io');
    if (io) {
      depletedProducts.forEach(({ productId, newCount }) => {
        io.to(`room:shop:${shopId}`).emit('ITEM_STOCK_CHANGED', {
          shopId,
          productId,
          inventoryCount: newCount,
          isAvailable: newCount > 0
        });
      });
    }

    const supabaseRealtime = app?.get?.('supabaseRealtime');
    if (supabaseRealtime) {
      supabaseRealtime.broadcast(`shop:${shopId}`, 'order:new', {
        orderId,
        totalAmount: finalAmount,
        paymentMethod,
        fulfillmentMethod,
        status: 'PENDING'
      });
    }

    return {
      success: true,
      orderId,
      totalAmount: finalAmount,
      breakdown: {
        itemsTotal: totalAmount,
        deliveryFee,
        platformFee: platformCommission
      },
      paymentMethod,
      paymentData
    };
  }

  async initiatePaymentGateway({ paymentMethod, finalAmount, orderId, userId }) {
    if (paymentMethod === 'RAZORPAY') {
      try {
        return await razorpay.orders.create({
          amount: Math.round(finalAmount * 100),
          currency: 'INR',
          receipt: `receipt_order_${orderId}`
        });
      } catch (err) {
        console.warn('Razorpay fallback', err.message);
        return { id: 'mock_rzp_' + Date.now(), amount: finalAmount * 100, currency: 'INR' };
      }
    } else if (paymentMethod === 'STRIPE') {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(finalAmount * 100),
          currency: 'inr',
          metadata: { orderId: orderId.toString() }
        });
        return { clientSecret: paymentIntent.client_secret, orderId };
      } catch (err) {
        console.warn('Stripe fallback', err.message);
        return { clientSecret: 'mock_stripe_secret_' + Date.now(), orderId };
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
        return response.data;
      } catch (err) {
        console.warn('Cashfree fallback', err.message);
        return { payment_session_id: 'mock_cashfree_' + Date.now(), orderId };
      }
    }
    return null;
  }
}

module.exports = new CheckoutService();
