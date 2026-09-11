// From '@sentry/nextjs/config', not '@sentry/nextjs': the root re-export is
// deprecated in v10 and stops working in v11.
import { withSentryConfig } from '@sentry/nextjs/config';

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
  experimental: {
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
  widenClientFileUpload: true,
  webpack: {
    // Strips Sentry's own debug logging from the production bundle.
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});

