/**
 * A baseline for every JSON write, applied once at the top of the API router.
 *
 * Only a handful of the ~460 write routes run a schema through validate(); the rest read
 * `req.body` fields directly. This does not know what any route expects, but it removes the
 * shapes no route ever wants and several can be hurt by:
 *
 *   - keys named __proto__ / constructor / prototype (prototype pollution through merges and spreads)
 *   - nesting deeper than MAX_DEPTH, or more than MAX_NODES values (a small payload that is expensive to walk)
 *   - a JSON body that is not an object or array (a bare string or number)
 *
 * Webhook deliveries are left alone: their bodies are signed and verified byte for byte.
 */
const MAX_DEPTH = 12;
const MAX_NODES = 50000;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function inspect(value) {
  let nodes = 0;
  const stack = [[value, 0]];
  while (stack.length) {
    const [v, depth] = stack.pop();
    if (v === null || typeof v !== 'object') continue;
    if (depth > MAX_DEPTH) return 'nested too deeply';
    const keys = Array.isArray(v) ? null : Object.keys(v);
    if (keys) {
      for (const k of keys) {
        if (FORBIDDEN.has(k)) return `the key "${k}" is not allowed`;
      }
    }
    for (const child of (keys ? keys.map((k) => v[k]) : v)) {
      nodes += 1;
      if (nodes > MAX_NODES) return 'too many values';
      if (child !== null && typeof child === 'object') stack.push([child, depth + 1]);
    }
  }
  return null;
}

function bodyGuard(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (/\/webhooks?(\/|$)/.test(req.originalUrl || req.url || '')) return next();
  const body = req.body;
  if (body === undefined || body === null) return next();
  if (Buffer.isBuffer(body)) return next();
  if (typeof body !== 'object') {
    return res.status(400).json({ success: false, error: 'The request body must be a JSON object.' });
  }
  const problem = inspect(body);
  if (problem) return res.status(400).json({ success: false, error: `The request body is not acceptable: ${problem}.` });
  return next();
}

module.exports = { bodyGuard, inspect, MAX_DEPTH, MAX_NODES };
