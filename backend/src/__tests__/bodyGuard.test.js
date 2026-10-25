const express = require('express');
const request = require('supertest');
const { bodyGuard, inspect, MAX_DEPTH } = require('../middleware/bodyGuard');

const app = express();
app.use(express.json());
app.use(bodyGuard);
app.post('/echo', (req, res) => res.json({ ok: true, body: req.body }));
app.post('/webhooks/x', (req, res) => res.json({ ok: true }));

test('ordinary bodies pass untouched', async () => {
  const res = await request(app).post('/echo').send({ a: 1, list: [1, 2, { b: 'c' }] });
  expect(res.status).toBe(200);
  expect(res.body.body).toEqual({ a: 1, list: [1, 2, { b: 'c' }] });
});

test('prototype-pollution keys are refused, at any depth', async () => {
  const res = await request(app).post('/echo').set('Content-Type', 'application/json').send('{"a":{"b":{"__proto__":{"admin":true}}}}');
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/__proto__/);
  const ctor = await request(app).post('/echo').send({ constructor: { prototype: { x: 1 } } });
  expect(ctor.status).toBe(400);
});

test('absurdly deep or huge bodies are refused', async () => {
  let deep = {};
  let cur = deep;
  for (let i = 0; i < MAX_DEPTH + 3; i += 1) { cur.n = {}; cur = cur.n; }
  expect((await request(app).post('/echo').send(deep)).status).toBe(400);
  expect(inspect({ list: new Array(50001).fill(1) })).toBe('too many values');
});

test('a bare JSON string is not a body, and webhooks are left to their own verification', async () => {
  const bare = await request(app).post('/echo').set('Content-Type', 'application/json').send('"hello"');
  expect([400]).toContain(bare.status);
  const hook = await request(app).post('/webhooks/x').send({ constructor: 1 });
  expect(hook.status).toBe(200);
});
