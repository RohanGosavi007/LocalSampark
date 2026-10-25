/**
 * How many reverse proxies sit between the internet and this process.
 *
 * Express uses the answer to pick the client's address out of
 * X-Forwarded-For: with N trusted hops, req.ip is the Nth address from the
 * right. Too low and req.ip is a proxy (everyone shares one address); too high
 * and req.ip is whatever the client wrote into the header.
 *
 * TRUST_PROXY_HOPS overrides the default of 1 in production, 0 elsewhere.
 * To check a deployment, compare the address in a rate-limit or audit log line
 * with the one the request really came from.
 */
function trustProxyHops() {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw !== undefined && raw !== '') {
    const hops = Number(raw);
    if (Number.isInteger(hops) && hops >= 0 && hops <= 10) return hops;
    // A mistyped value must not silently become "trust everything".
    throw new Error(`TRUST_PROXY_HOPS must be a whole number from 0 to 10, got "${raw}"`);
  }
  return process.env.NODE_ENV === 'production' ? 1 : 0;
}

module.exports = { trustProxyHops };
