#!/usr/bin/env node
/**
 * A stand-in for Sentry in the E2E run (P8).
 *
 * The E2E web and admin builds have error reporting switched on, so that the
 * observability specs can see what a real error sends. Pointed at the real
 * Sentry it would put page-load traffic on the internet (HTTP 400s in the
 * console-error specs); pointed at the E2E API it was counted by the API's
 * per-IP rate limit and starved the sign-in tests of requests (429). This answers
 * every request with 200 and CORS headers and keeps nothing.
 */
const http = require('http');

const PORT = Number(process.env.SENTRY_SINK_PORT) || 5099;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  req.resume(); // read and discard the envelope
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{}');
}).listen(PORT, '127.0.0.1', () => console.log(`[sentry-sink] listening on ${PORT}`));
