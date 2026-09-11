/**
 * CSRF guard for cookie-authenticated admin requests.
 *
 * The admin access token moved out of localStorage (readable by any injected
 * script) and into an httpOnly cookie. Cookies are attached by the browser to
 * cross-site requests automatically, so that move is only safe while the
 * double-submit check below actually holds. These tests pin the two halves of
 * that contract: forged cross-site writes are rejected, and the callers that
 * were never at risk keep working unchanged.
 */
const { verifyCsrf, generateCsrfToken, CSRF_COOKIE } = require('../../middleware/csrf.middleware');

function makeReq({ method = 'POST', authSource = 'cookie', cookieToken, headerToken } = {}) {
  const cookies = {};
  if (cookieToken !== undefined) cookies[CSRF_COOKIE] = cookieToken;
  return {
    method,
    authSource,
    cookies,
    get(name) {
      return name.toLowerCase() === 'x-csrf-token' ? headerToken : undefined;
    },
  };
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

function run(req) {
  const res = makeRes();
  let nexted = false;
  verifyCsrf(req, res, () => { nexted = true; });
  return { res, nexted };
}

describe('verifyCsrf', () => {
  const token = generateCsrfToken();

  describe('rejects forged cross-site writes', () => {
    it('blocks a cookie-authenticated POST with no CSRF header', () => {
      // This is the attack: another origin causes the browser to replay the
      // session cookie, but same-origin policy stops it reading csrf_token, so
      // it cannot produce the header.
      const { res, nexted } = run(makeReq({ cookieToken: token, headerToken: undefined }));
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('CSRF_INVALID');
    });

    it('blocks a cookie-authenticated POST whose header does not match', () => {
      const { res, nexted } = run(
        makeReq({ cookieToken: token, headerToken: generateCsrfToken() })
      );
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it('blocks when the cookie is missing entirely', () => {
      const { res, nexted } = run(makeReq({ cookieToken: undefined, headerToken: token }));
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it.each(['PUT', 'PATCH', 'DELETE'])('guards %s as well as POST', (method) => {
      const { res, nexted } = run(makeReq({ method, cookieToken: token }));
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('lets legitimate traffic through', () => {
    it('allows a cookie-authenticated POST when the header matches the cookie', () => {
      const { res, nexted } = run(makeReq({ cookieToken: token, headerToken: token }));
      expect(nexted).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    it.each(['GET', 'HEAD', 'OPTIONS'])('exempts safe method %s', (method) => {
      const { res, nexted } = run(makeReq({ method, cookieToken: token }));
      expect(nexted).toBe(true);
      expect(res.statusCode).toBeNull();
    });
  });

  describe('does not disturb header-authenticated callers', () => {
    // The mobile app, scripts and curl send Authorization: Bearer. A header is
    // never attached automatically, so those requests are not forgeable and
    // must not suddenly start needing a CSRF token -- that would be a breaking
    // change for every non-browser client.
    it('allows a bearer-authenticated POST with no CSRF token at all', () => {
      const { res, nexted } = run(
        makeReq({ authSource: 'header', cookieToken: undefined, headerToken: undefined })
      );
      expect(nexted).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    it('allows a query-token POST', () => {
      const { res, nexted } = run(makeReq({ authSource: 'query' }));
      expect(nexted).toBe(true);
    });
  });

  describe('generateCsrfToken', () => {
    it('returns a 256-bit hex value', () => {
      expect(generateCsrfToken()).toMatch(/^[0-9a-f]{64}$/);
    });

    it('does not repeat', () => {
      const seen = new Set(Array.from({ length: 200 }, () => generateCsrfToken()));
      expect(seen.size).toBe(200);
    });
  });
});
