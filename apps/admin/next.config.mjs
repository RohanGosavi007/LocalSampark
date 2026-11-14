// From '@sentry/nextjs/config', not '@sentry/nextjs': the root re-export is
// deprecated in v10 and stops working in v11 (same as apps/web/next.config.mjs).
import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The shared workspace package ships untranspiled CommonJS source rather than
  // a build artefact, so Next has to compile it alongside the app. Without
  // this, importing @localsampark/shared/territoryTopology fails at build time
  // in a way whose message points at node_modules rather than at the cause.
  transpilePackages: ['@localsampark/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ]
  },

  /**
   * Security response headers for the admin panel.
   *
   * The admin session token lives in localStorage, which is readable by any
   * script that manages to run on this origin. The panel has no XSS sink today
   * (no dangerouslySetInnerHTML, no innerHTML, no eval anywhere in src/), so
   * these headers are the layer that keeps it that way and limits the damage of
   * a future one. They cost nothing and cannot break a same-origin app.
   *
   * Note on Content-Security-Policy: it is not set here, because Next.js
   * injects inline bootstrap and hydration scripts and a CSP for this app is
   * only meaningful with per-request nonces — a `script-src 'self'
   * 'unsafe-inline'` policy would look like protection while permitting the
   * injected-script attack it appears to stop. It is set per request, with a
   * nonce, in src/middleware.js (policy in src/lib/csp.mjs).
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The admin panel is never legitimately framed; this blocks
          // clickjacking of destructive controls like ban/approve/payout.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops the browser MIME-sniffing a response into executable script.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Admin URLs carry ids in the path; do not leak them to third parties.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Hardware the admin panel never uses.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          // Belt-and-braces against cross-origin isolation downgrades.
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
};

// Source maps are uploaded (and hidden from the browser) only when a
// SENTRY_AUTH_TOKEN is present; without one the build is untouched.
export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
