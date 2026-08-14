'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * PageTransition
 *
 * Cross-fades route content on navigation, keyed on the pathname.
 *
 * `mode="wait"` would hold the old route on screen for the full exit before
 * mounting the new one, which adds latency to every navigation. Overlapping
 * the two keeps transitions under 300ms end to end.
 *
 * Wrap {children} in app/layout.js.
 */
export default function PageTransition({ children, className = '' }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        className={className}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        // Scroll restoration is the browser's job; animating a transform on the
        // page wrapper would otherwise fight it during back navigation.
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
