// From '@sentry/nextjs/config', not '@sentry/nextjs': the root re-export is
// deprecated in v10 and stops working in v11.
import { withSentryConfig } from '@sentry/nextjs/config';
import { ADMIN_CONSOLE_TABS, adminConsoleUrl, FRANCHISE_REDIRECTS } from './src/lib/adminConsole.mjs';
import { SECURITY_HEADERS } from './src/lib/csp.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }
    ]
  },
  productionBrowserSourceMaps: false,
  experimental: {
    webpackMemoryOptimizations: true,
    cpus: 1,
    optimizePackageImports: [
      'lucide-react',
      '@phosphor-icons/react',
      'framer-motion',
      'recharts',
      'socket.io-client',
      'swiper',
      'react-hot-toast',
      'react-leaflet',
      'leaflet',
    ]
  },
  // /admin-dashboard modules that only had placeholder pages here are served
  // by the dedicated admin console. Exact paths only: nested real pages such as
  // /admin-dashboard/logistics/map stay in this app.
  //
  // /franchise/* sub-pages were static "Module Provisioned" placeholders that
  // duplicated /franchise-dashboard/*, which reads /api/v1/franchise/*. Each is
  // sent to the wired page closest to it. /franchise itself (the public
  // partner application) and /franchise/territory (live map) are real.
  // P9: security headers on every response. The CSP itself is per request
  // (it carries a nonce) and is set in src/middleware.js.
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async redirects() {
    const adminConsole = Object.keys(ADMIN_CONSOLE_TABS).map((key) => ({
      source: `/admin-dashboard/${key}`,
      destination: adminConsoleUrl(key),
      permanent: false,
    }));
    const franchise = Object.entries(FRANCHISE_REDIRECTS).map(([key, destination]) => ({
      source: `/franchise/${key}`,
      destination,
      permanent: false,
    }));
    return [...adminConsole, ...franchise];
  },
  // Increase chunk loading timeout to prevent ChunkLoadError on slow dev compilations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Increase the chunk loading timeout from default 120s to 300s
      config.output = {
        ...config.output,
        chunkLoadTimeout: 300000,
      };
    }
    return config;
  },
};

// Options updated for @sentry/nextjs 10. The three that moved were warning on
// every build after the 8 -> 10 upgrade and are slated for removal:
//   disableLogger          -> webpack.treeshake.removeDebugLogging
//   automaticVercelMonitors -> webpack.automaticVercelMonitors
//   (the withSentryConfig import itself moved to @sentry/nextjs/config, see top)
export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    // Strips Sentry's own debug logging from the production bundle.
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});

