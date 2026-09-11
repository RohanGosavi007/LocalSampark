/**
 * Shared OTP store.
 *
 * This module exists because /auth/send-otp used to keep its codes in a Map
 * private to auth.routes.js. Nothing else could read them — which is why
 * /admin-auth/login required an `otp` field in the request body and then never
 * compared its value to anything, reducing admin sign-in to phone + PIN.
 *
 * The behaviours locked in here are the ones that made that bug possible or
 * that would silently reintroduce it: codes must be readable across callers,
 * single-use, expiring, and unavailable rather than process-local in production.
 */

// No Redis in the unit environment, so the dev in-memory path is what runs.
jest.mock('../../config/redis', () => ({
  redisClient: null,
  cacheSet: jest.fn(),
  cacheGet: jest.fn(),
  cacheDel: jest.fn(),
}));

const otpStore = require('../../modules/core/services/otpStore.service');

const ORIGINAL_ENV = process.env.NODE_ENV;

beforeEach(() => {
  otpStore.__memoryStore.clear();
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});

describe('otpStore', () => {
  it('round-trips a code across separate callers', async () => {
    // The whole point: /auth/send-otp writes, /admin-auth/login reads.
    await otpStore.setOtp('otp:+919876543210', '482915');
    expect(await otpStore.getOtp('otp:+919876543210')).toBe('482915');
  });

  it('returns null for a key that was never set', async () => {
    expect(await otpStore.getOtp('otp:+910000000000')).toBeNull();
  });

  describe('verifyAndConsume', () => {
    it('accepts the correct code', async () => {
      await otpStore.setOtp('otp:+91999', '123456');
      expect(await otpStore.verifyAndConsume('otp:+91999', '123456')).toBe(true);
    });

    it('consumes the code so it cannot be replayed', async () => {
      await otpStore.setOtp('otp:+91999', '123456');
      expect(await otpStore.verifyAndConsume('otp:+91999', '123456')).toBe(true);
      // A captured code must not authenticate a second request.
      expect(await otpStore.verifyAndConsume('otp:+91999', '123456')).toBe(false);
    });

    it('rejects a wrong code and leaves the stored one intact', async () => {
      await otpStore.setOtp('otp:+91999', '123456');
      expect(await otpStore.verifyAndConsume('otp:+91999', '999999')).toBe(false);
      // A wrong guess must not burn the real code, or a typo would force a resend.
      expect(await otpStore.getOtp('otp:+91999')).toBe('123456');
    });

    it('rejects an empty or missing submission', async () => {
      await otpStore.setOtp('otp:+91999', '123456');
      expect(await otpStore.verifyAndConsume('otp:+91999', '')).toBe(false);
      expect(await otpStore.verifyAndConsume('otp:+91999', undefined)).toBe(false);
    });

    it('rejects when nothing was ever stored', async () => {
      // Guards against an "absent means valid" regression.
      expect(await otpStore.verifyAndConsume('otp:+91404', '123456')).toBe(false);
    });

    it('compares as strings so a numeric submission still matches', async () => {
      await otpStore.setOtp('otp:+91999', '123456');
      expect(await otpStore.verifyAndConsume('otp:+91999', 123456)).toBe(true);
    });
  });

  describe('expiry', () => {
    it('treats an elapsed code as absent', async () => {
      await otpStore.setOtp('otp:+91999', '123456', -1); // already expired
      expect(await otpStore.getOtp('otp:+91999')).toBeNull();
      expect(await otpStore.verifyAndConsume('otp:+91999', '123456')).toBe(false);
    });

    it('sweeps expired entries on write so the Map cannot grow unbounded', async () => {
      // The original store never swept; it grew for the life of the process.
      await otpStore.setOtp('otp:stale', '111111', -1);
      expect(otpStore.__memoryStore.size).toBe(1);
      await otpStore.setOtp('otp:fresh', '222222');
      expect(otpStore.__memoryStore.has('otp:stale')).toBe(false);
      expect(otpStore.__memoryStore.has('otp:fresh')).toBe(true);
    });
  });

  describe('production safety', () => {
    it('reports itself unavailable in production without Redis', () => {
      process.env.NODE_ENV = 'production';
      // Behind a load balancer a process-local Map means the verify can land on
      // a different instance than the send, so login fails for an arbitrary
      // fraction of users. Callers turn this into a 503.
      expect(otpStore.unavailableReason()).toMatch(/REDIS_URL/);
      expect(otpStore.isAvailable()).toBe(false);
    });

    it('is available outside production without Redis', () => {
      expect(otpStore.unavailableReason()).toBeNull();
      expect(otpStore.isAvailable()).toBe(true);
    });
  });
});
