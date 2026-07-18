import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' }
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

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "localsampark",
    project: "localsampark-web",
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);

