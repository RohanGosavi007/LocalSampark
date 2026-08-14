'use client';

import dynamic from 'next/dynamic';

/**
 * SSR-safe entry point for Floating3DCard.
 *
 * Three.js touches `window` and WebGL at module scope, so it cannot run during
 * server rendering. Importing the card through this wrapper keeps it out of the
 * server bundle and off the critical path, and shows a themed placeholder that
 * reserves the same height to avoid layout shift.
 */
const Floating3DCard = dynamic(() => import('./Floating3DCard'), {
  ssr: false,
  loading: () => (
    <div
      className="relative w-full animate-pulse rounded-lg-token bg-glass-white-10 backdrop-blur-xl"
      style={{ height: 380 }}
      aria-hidden="true"
    />
  ),
});

export default Floating3DCard;
