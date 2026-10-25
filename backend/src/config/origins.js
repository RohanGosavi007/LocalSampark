/**
 * Which web origins may call this API from a browser.
 *
 * The API answers with Access-Control-Allow-Credentials, and the admin console
 * authenticates with a cookie, so an origin on this list can make requests as
 * whoever is signed in and read the answers. The list has to be the sites this
 * project runs, and nothing else.
 *
 * It used to include every origin ending in .onrender.com. That is every site
 * hosted on Render by anyone: registering one takes a minute, and a page on it
 * could then read an administrator's data from their browser. It also allowed
 * any origin at all whenever NODE_ENV was not exactly "production".
 *
 * Now:
 *   CLIENT_URL, ADMIN_URL          the web app and the admin console
 *   ALLOWED_ORIGINS                comma-separated extras (a custom domain, a
 *                                  preview deployment you choose to trust)
 *   RENDER_EXTERNAL_URL            this service's own address
 *   http://localhost:*             only when NODE_ENV is development or test
 *
 * Used by the HTTP CORS middleware (server.js) and by Socket.IO
 * (sockets/index.js), which kept a separate, different list.
 */

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const clean = (value) => String(value || '').trim().replace(/\/+$/, '');

/** Explicitly configured origins, read at call time so tests and reloads see changes. */
function configuredOrigins() {
  const list = [
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...String(process.env.ALLOWED_ORIGINS || '').split(','),
  ];
  return [...new Set(list.map(clean).filter((origin) => /^https?:\/\//i.test(origin)))];
}

const isLocalDevelopment = () => ['development', 'test'].includes(process.env.NODE_ENV);

/**
 * May a browser page at `origin` call this API?
 *
 * A request with no Origin header is not a cross-origin browser request — it
 * is the mobile app, curl, or another server — and CORS has nothing to say
 * about it; those are authenticated by their token like any other.
 */
function isAllowedOrigin(origin) {
  if (!origin) return true;
  const candidate = clean(origin);
  if (configuredOrigins().includes(candidate)) return true;
  if (isLocalDevelopment() && LOCAL.test(candidate)) return true;
  return false;
}

/** `origin` option for cors() and Socket.IO. */
function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}

module.exports = { configuredOrigins, isAllowedOrigin, corsOrigin };
