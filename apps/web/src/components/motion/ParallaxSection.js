'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';

/**
 * ParallaxSection / ParallaxLayer
 *
 * Moves layers at differing rates as the section passes through the viewport.
 *
 * Scroll progress is spring-smoothed because raw scroll deltas arrive in
 * uneven steps on trackpads and mouse wheels, which shows up as judder on any
 * element bound directly to them.
 */

export function ParallaxLayer({
  children,
  speed = 0.2,
  className = '',
  progress,
  fade = false,
}) {
  const reduce = useReducedMotion();

  // Positive speed trails the scroll, negative leads it.
  const y = useTransform(progress, [0, 1], ['0%', `${speed * 100}%`]);
  const opacity = useTransform(progress, [0, 0.6, 1], [1, 1, fade ? 0 : 1]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} style={{ y, opacity, willChange: 'transform' }}>
      {children}
    </motion.div>
  );
}

export default function ParallaxSection({
  children,
  className = '',
  offset = ['start end', 'end start'],
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.6 });

  return (
    <section ref={ref} className={`relative ${className}`}>
      {typeof children === 'function' ? children(smooth) : children}
    </section>
  );
}
