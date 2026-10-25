const request = require('supertest');
const express = require('express');
const validateEnv = require('../config/envValidator');

describe('Security Regression Suite — N1: Free OTP Leak & Production Boot Guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('envValidator boot guard', () => {
    test('[N1.1] refuses to boot when NODE_ENV is production and ALLOW_FREE_OTP_MODE is true', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_FREE_OTP_MODE = 'true';
      process.env.JWT_SECRET = 'a'.repeat(32); // valid secret length

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit called with ${code}`);
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => validateEnv()).toThrow(/process.exit called with 1/);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ALLOW_FREE_OTP_MODE cannot be enabled in production'));

      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('auth routes OTP response leakage prevention', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      const authRoutes = require('../modules/core/routes/auth.routes');
      app.use('/auth', authRoutes);
    });

    test('[N1.2] send-otp never returns OTP field when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_FREE_OTP_MODE = 'true';

      const res = await request(app)
        .post('/auth/send-otp')
        .send({ phoneNumber: '+919876543210' });

      // Even if mock SMS fails or succeeds, otp field must never exist in response
      expect(res.body.otp).toBeUndefined();
    });

    test('[N1.3] send-whatsapp-otp never returns OTP field when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_FREE_OTP_MODE = 'true';

      const res = await request(app)
        .post('/auth/send-whatsapp-otp')
        .send({ phoneNumber: '+919876543210' });

      expect(res.body.otp).toBeUndefined();
    });

    test('[N1.4] demo numbers (+919000*) never get fixed 123456 OTP in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_FREE_OTP_MODE = 'true';

      const res = await request(app)
        .post('/auth/send-otp')
        .send({ phoneNumber: '+919000000001' });

      expect(res.body.otp).toBeUndefined();
    });
  });
});
