'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * PageTransition
 *
 * Fades and lifts route content in on navigation, keyed on the pathname.
 *
 * This used to cross-fade with AnimatePresence, keeping the old route's
 * wrapper mounted through its exit animation. In the App Router `children`
 * is a layout-router element that renders whatever route is *current*, so
 * the exiting wrapper re-rendered with the new page: for the length of the
 * exit two copies of the destination page were mounted. That meant two of
 * every form field (an E2E spec filling "Subject" found two), every effect
 * and API call run twice, and sockets subscribed twice. Only the entering
 * route animates now; the old one unmounts at once.
 *
 * Wrap {children} in app/layout.js.
 */
export default function PageTransition({ children, className = '' }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      // Scroll restoration is the browser's job; animating a transform on the
      // page wrapper would otherwise fight it during back navigation.
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}
