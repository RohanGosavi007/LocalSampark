/**
 * A streamed response must not crash the server (F-148).
 *
 * auditLogger wraps res.end and set X-Request-Id / X-Response-Time inside it.
 * A streamed response (the invoice PDF is piped from pdfkit) sends its
 * headers with the first chunk, so by the time end() ran, setHeader threw
 * ERR_HTTP_HEADERS_SENT from the stream's end event. Nothing could catch it
 * there; server.js's uncaughtException handler exited, and every invoice
 * download took the whole API down.
 */
const express = require('express');
const request = require('supertest');
const { Readable } = require('stream');
const { auditLogger } = require('../../middleware/audit.middleware');

function app() {
  const a = express();
  a.use(auditLogger);
  a.get('/streamed', (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    // Like pdfkit: written in chunks, then ended by the stream itself.
    Readable.from([Buffer.from('%PDF-1.3\n'), Buffer.from('x'.repeat(4096)), Buffer.from('%%EOF')]).pipe(res);
  });
  a.get('/plain', (req, res) => res.json({ ok: true }));
  return a;
}

describe('audit logger and streamed responses', () => {
  let uncaught;
  const onUncaught = (e) => { uncaught = e; };
  beforeEach(() => { uncaught = null; process.prependListener('uncaughtException', onUncaught); });
  afterEach(() => { process.removeListener('uncaughtException', onUncaught); });

  test('[C9.16] a piped response completes and raises nothing', async () => {
    // Before the fix the response never ended; fail in seconds, not hang.
    const res = await request(app()).get('/streamed').timeout(4000).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(res.body.subarray(-5).toString()).toBe('%%EOF');
    await new Promise((r) => setImmediate(r));
    expect(uncaught).toBeNull();
  });

  test('[C9.17] an ordinary response still carries the request id and timing headers', async () => {
    const res = await request(app()).get('/plain');
    expect(res.headers['x-request-id']).toMatch(/^req-/);
    expect(res.headers['x-response-time']).toMatch(/ms$/);
  });
});
