'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * StaggerGrid / StaggerItem
 *
 * Reveals children in sequence when the grid scrolls into view.
 *
 * The existing cards animated on mount, which meant anything below the fold
 * finished its reveal while off-screen and was already visible by the time the
 * user scrolled to it. Driving the reveal from `whileInView` fixes that, and
 * orchestrating it from the parent means each child does not need its own
 * index-based delay.
 */

export function StaggerGrid({
  children,
  className = '',
  stagger = 0.06,
  delayChildren = 0.05,
  once = true,
  amount = 0.15,
  as = 'div',
  ...rest
}) {
  const reduce = useReducedMotion();
  const Component = motion[as] || motion.div;

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      // `once` avoids re-running the reveal every time the grid re-enters,
      // which reads as flicker on short scrolls.
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduce ? 0 : stagger,
            delayChildren: reduce ? 0 : delayChildren,
          },
        },
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className = '', distance = 26, ...rest }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce
          ? { opacity: 0 }
          : { opacity: 0, y: distance, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: reduce
            ? { duration: 0.2 }
            : { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default StaggerGrid;
