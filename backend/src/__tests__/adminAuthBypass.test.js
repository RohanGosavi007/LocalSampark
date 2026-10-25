const request = require('supertest');
const express = require('express');

describe('Security Regression Suite — L1: Admin Quick-Login Bypass Rejection in Production', () => {
  const originalEnv = { ...process.env };
  let app;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    app = express();
    app.use(express.json());
    const adminAuthRoutes = require('../modules/crm/routes/admin-auth.routes');
    app.use('/crm/admin/auth', adminAuthRoutes);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('[L1.1] dev bypass credentials (+919999999991 / 123456) are strictly rejected when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .post('/crm/admin/auth/login-verify')
      .send({
        phoneNumber: '+919999999991',
        pin: '123456',
        otp: '123456',
      });

    // In production without valid OTP store or with OTP bypass rejected, status must be 401 or 503, never 200
    expect(res.status).not.toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(res.body.accessToken).toBeUndefined();
  });

  test('[L1.2] demo personas (+919000*) with 123456 OTP are rejected from admin verify in production', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(app)
      .post('/crm/admin/auth/login-verify')
      .send({
        phoneNumber: '+919000000012',
        pin: '123456',
        otp: '123456',
      });

    expect(res.status).not.toBe(200);
    expect(res.body.token).toBeUndefined();
  });
});
