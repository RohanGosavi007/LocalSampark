/**
 * The web cart sends its guest session as X-Session-Id
 * (apps/web/src/store/cartStore.js; modules/ecommerce/routes/cart.routes.js
 * reads it). The header was not in the CORS allow-list, so the browser's
 * preflight refused every cart request and the web cart never reached the
 * server (F-149). The app is not subject to CORS, which is why only the web
 * was affected. This preflights the real server.
 */
const request = require('supertest');
const { app } = require('../../server');

test('[C6.23] a browser may send the cart session header to the API', async () => {
  const res = await request(app)
    .options('/api/v1/cart')
    .set('Origin', 'http://localhost:3000')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type,authorization,x-session-id');
  expect(res.status).toBeLessThan(300);
  const allowed = String(res.headers['access-control-allow-headers'] || '').toLowerCase().split(/\s*,\s*/);
  expect(allowed).toEqual(expect.arrayContaining(['content-type', 'authorization', 'x-session-id']));
  expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
});
