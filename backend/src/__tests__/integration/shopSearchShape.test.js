/**
 * GET /shops/search answers in the shape its clients read.
 *
 * The body carried only `data`; the web search page and the mobile search screen read
 * `success` and `shops`, so neither ever displayed a result.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

test('search returns success, shops and data, all the same list', async () => {
  const res = await request(app).get('/shops/search?q=grocery');
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(Array.isArray(res.body.shops)).toBe(true);
  expect(res.body.data).toEqual(res.body.shops);
});
