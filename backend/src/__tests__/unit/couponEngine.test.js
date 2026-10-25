const express = require('express');
const request = require('supertest');
const couponService = require('../../services/coupon.service');
const { query } = require('../../config/database');

describe('C7 Coupon Engine', () => {
  const TEST_SHOP_ID = 'test-shop-coupon-1';
  const TEST_USER_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';

  beforeAll(async () => {
    // Ensure test user exists in users table
    await query("DELETE FROM users WHERE id = $1", [TEST_USER_ID]);
    await query(
      "INSERT INTO users (id, phone_number, full_name, role, is_active, token_version) VALUES ($1, '+919876543210', 'Coupon Tester', 'customer', true, 0)",
      [TEST_USER_ID]
    );

    // Clean up any test coupons
    await query("DELETE FROM coupons WHERE code LIKE 'TEST_%'");
    await query("DELETE FROM coupon_redemptions WHERE coupon_id LIKE 'cpn-test-%'");

    // Seed test coupons
    await couponService.createCoupon({
      code: 'TEST_FIXED50',
      discount_type: 'fixed',
      discount_value: 50,
      min_order_amount: 150,
      max_uses: 10,
      per_user_limit: 1,
      description: '₹50 off test'
    });

    await couponService.createCoupon({
      code: 'TEST_PCT20',
      discount_type: 'percentage',
      discount_value: 20,
      min_order_amount: 100,
      max_discount_amount: 50,
      max_uses: 100,
      per_user_limit: 2,
      description: '20% off up to ₹50'
    });

    await couponService.createCoupon({
      code: 'TEST_FIRSTONLY',
      discount_type: 'fixed',
      discount_value: 100,
      min_order_amount: 200,
      max_uses: 50,
      first_order_only: true,
      description: 'First order only discount'
    });
  });

  afterAll(async () => {
    await query("DELETE FROM coupons WHERE code LIKE 'TEST_%'");
    await query("DELETE FROM users WHERE id = $1", [TEST_USER_ID]);
  });

  test('[C7.1] validates fixed discount coupon successfully', async () => {
    const res = await couponService.validateCoupon({
      code: 'TEST_FIXED50',
      cartTotal: 200,
      userId: TEST_USER_ID
    });

    expect(res.valid).toBe(true);
    expect(res.coupon.code).toBe('TEST_FIXED50');
    expect(res.coupon.discount).toBe(50);
  });

  test('[C7.2] rejects coupon when minimum order value is not met', async () => {
    await expect(couponService.validateCoupon({
      code: 'TEST_FIXED50',
      cartTotal: 100, // min is 150
      userId: TEST_USER_ID
    })).rejects.toThrow('Minimum order value for this coupon is ₹150');
  });

  test('[C7.3] calculates percentage discount and caps at max_discount_amount', async () => {
    const res = await couponService.validateCoupon({
      code: 'TEST_PCT20',
      cartTotal: 500, // 20% is 100, capped at 50
      userId: TEST_USER_ID
    });

    expect(res.valid).toBe(true);
    expect(res.coupon.discount).toBe(50);
  });

  test('[C7.4] rejects unknown or invalid coupon code', async () => {
    await expect(couponService.validateCoupon({
      code: 'NONEXISTENT_CODE',
      cartTotal: 500,
      userId: TEST_USER_ID
    })).rejects.toThrow('Invalid or expired coupon code');
  });

  test('[C7.5] atomically redeems coupon and increments current_uses', async () => {
    const coupon = await couponService.createCoupon({
      code: 'TEST_REDEEM_ONCE',
      discount_type: 'fixed',
      discount_value: 30,
      min_order_amount: 50,
      max_uses: 1,
      description: 'Single use coupon'
    });

    // First redemption succeeds
    const redRes = await couponService.redeemCoupon({
      couponId: coupon.id,
      userId: TEST_USER_ID,
      orderId: 'ord-test-1',
      discountApplied: 30
    });
    expect(redRes.success).toBe(true);

    // Second redemption fails due to max_uses limit
    await expect(couponService.redeemCoupon({
      couponId: coupon.id,
      userId: 'test-user-2',
      orderId: 'ord-test-2',
      discountApplied: 30
    })).rejects.toThrow('Coupon was claimed by another customer');
  });

  test('[C7.6] POST /orders/validate-coupon endpoint returns validated coupon', async () => {
    const jwt = require('jsonwebtoken');
    const { getJwtSecret } = require('../../config/secrets');
    const token = jwt.sign({ userId: TEST_USER_ID, role: 'customer' }, getJwtSecret(), { expiresIn: '1h' });

    const app = express();
    app.use(express.json());
    app.use('/orders', require('../../modules/ecommerce/routes/order.routes'));

    const res = await request(app)
      .post('/orders/validate-coupon')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'TEST_FIXED50', cartTotal: 250 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.coupon.code).toBe('TEST_FIXED50');
    expect(res.body.coupon.discount).toBe(50);
  });
});
