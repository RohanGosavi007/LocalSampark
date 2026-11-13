const express = require('express');
const request = require('supertest');
const { isFeatureEnabled, getAllFeatures, FEATURES } = require('../../../../packages/shared/src/features');
const { requireFeature } = require('../../middleware/featureFlag.middleware');

describe('P6 Feature Flag Registry & Middleware', () => {
  test('[P6.1] defines canonical launch-scoped and off-at-launch features', () => {
    expect(FEATURES.COMMERCE_CORE.enabled).toBe(true);
    expect(FEATURES.COUPONS.enabled).toBe(true);
    expect(FEATURES.SOCIETY_MANAGEMENT.enabled).toBe(false);
    expect(FEATURES.CARPOOL.enabled).toBe(false);
    expect(FEATURES.JOBS.enabled).toBe(false);
    expect(FEATURES.MEDICAL.enabled).toBe(false);
  });

  test('[P6.1] isFeatureEnabled evaluates launch defaults correctly', () => {
    expect(isFeatureEnabled('commerce_core', {})).toBe(true);
    expect(isFeatureEnabled('coupons', {})).toBe(true);
    expect(isFeatureEnabled('carpool', {})).toBe(false);
    expect(isFeatureEnabled('society_management', {})).toBe(false);
  });

  test('environment override takes precedence', () => {
    expect(isFeatureEnabled('carpool', { FEATURE_CARPOOL: 'true' })).toBe(true);
    expect(isFeatureEnabled('coupons', { FEATURE_COUPONS: 'false' })).toBe(false);
  });

  test('[P6.3] middleware blocks disabled features with 403 when bypass is off', async () => {
    const app = express();
    app.use('/test-carpool', (req, res, next) => {
      // simulate non-bypass environment
      const origBypass = process.env.BYPASS_FEATURE_FLAGS;
      delete process.env.BYPASS_FEATURE_FLAGS;
      const mw = requireFeature('carpool');
      mw(req, res, (err) => {
        process.env.BYPASS_FEATURE_FLAGS = origBypass;
        next(err);
      });
    }, (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test-carpool');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FEATURE_DISABLED');
    expect(res.body.feature).toBe('carpool');
  });

  test('[P6.2] middleware allows enabled features through', async () => {
    const app = express();
    app.use('/test-commerce', requireFeature('commerce_core'), (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test-commerce');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('[P6.1] getAllFeatures returns lookup of all feature statuses', () => {
    const all = getAllFeatures({});
    expect(all.commerce_core.is_enabled).toBe(true);
    expect(all.carpool.is_enabled).toBe(false);
    expect(all.society_management.is_enabled).toBe(false);
  });

  test('[P6.1] GET /features returns all feature statuses via main router', async () => {
    const app = express();
    app.use('/', require('../../routes'));
    const res = await request(app).get('/features');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.features.commerce_core.is_enabled).toBe(true);
    expect(res.body.features.carpool.is_enabled).toBe(false);
  });

  describe('through the real API router', () => {
    let saved;
    let app;
    beforeAll(() => {
      saved = process.env.BYPASS_FEATURE_FLAGS;
      app = express();
      app.use(express.json());
      app.use('/', require('../../routes'));
    });
    afterEach(() => {
      if (saved === undefined) delete process.env.BYPASS_FEATURE_FLAGS;
      else process.env.BYPASS_FEATURE_FLAGS = saved;
    });

    test('[P6.4] BYPASS_FEATURE_FLAGS=true lets a test reach a disabled vertical', async () => {
      process.env.BYPASS_FEATURE_FLAGS = 'true';
      const res = await request(app).get('/carpool/rides');
      expect(res.body.error).not.toBe('FEATURE_DISABLED');
    });

    test.each(['/carpool/rides', '/societies'])('[P6.6] %s, a disabled vertical, answers 403 FEATURE_DISABLED', async (path) => {
      delete process.env.BYPASS_FEATURE_FLAGS;
      const res = await request(app).get(path);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FEATURE_DISABLED');
    });

    test.each(['/shops/nearby', '/features'])('[P6.5] %s, part of the launch commerce core, stays open', async (path) => {
      delete process.env.BYPASS_FEATURE_FLAGS;
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.error).not.toBe('FEATURE_DISABLED');
    });
  });
});
