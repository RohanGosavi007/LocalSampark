/**
 * Signing-secret resolution.
 *
 * JWT secrets were resolved inline as
 *
 *     process.env.JWT_SECRET || 'fallback_localsampark_secret_key_2026'
 *     process.env.JWT_REFRESH_SECRET || 'dev_refresh_key'
 *
 * at five call sites. Those literals are in the repository, so a production
 * deploy that forgot the environment variable would sign and — critically —
 * *verify* tokens with a publicly known key. Anyone could then mint a token for
 * any user id and any role, including super_admin. That is a complete
 * authentication bypass, not a hardening nit.
 *
 * Resolution is centralised here and fails closed: outside development a
 * missing secret is a startup error rather than a silent downgrade.
 */

const DEV_ONLY_JWT_SECRET = 'dev_only_insecure_jwt_secret';
const DEV_ONLY_REFRESH_SECRET = 'dev_only_insecure_refresh_secret';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function resolve(varName, devFallback) {
  const value = process.env[varName];
  if (value) return value;

  if (isProduction()) {
    // Thrown, not returned: booting an authentication system with a known key
    // is strictly worse than refusing to boot.
    throw new Error(
      `${varName} is not set. Refusing to start in production with a known signing key. ` +
      `Set ${varName} to a long random value (openssl rand -base64 48).`
    );
  }

  if (!resolve._warned) resolve._warned = new Set();
  if (!resolve._warned.has(varName)) {
    console.warn(`[secrets] ${varName} not set — using an insecure development key. NEVER deploy this.`);
    resolve._warned.add(varName);
  }
  return devFallback;
}

/** Access-token signing/verification secret. */
function getJwtSecret() {
  return resolve('JWT_SECRET', DEV_ONLY_JWT_SECRET);
}

/**
 * Refresh-token secret. Falls back to the access secret only when
 * JWT_REFRESH_SECRET is genuinely absent, preserving existing behaviour for
 * deployments that only ever configured one.
 */
function getJwtRefreshSecret() {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  if (isProduction()) return getJwtSecret();
  return resolve('JWT_REFRESH_SECRET', DEV_ONLY_REFRESH_SECRET);
}

/**
 * Call once at boot so a misconfigured production deploy fails immediately and
 * visibly, rather than on the first login attempt.
 */
function assertSecretsConfigured() {
  getJwtSecret();
  getJwtRefreshSecret();
}

module.exports = { getJwtSecret, getJwtRefreshSecret, assertSecretsConfigured };
