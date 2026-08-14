'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * TiltCard
 *
 * A surface that tilts in 3D toward the pointer, with a glare highlight that
 * tracks the same position. Rotation is driven by motion values through
 * springs, so it never re-renders React on pointer movement.
 *
 * Wrap content that should sit above the glare in a `translateZ` layer via the
 * `depth` prop on children markup.
 */
export default function TiltCard({
  children,
  className = '',
  maxTilt = 10,
  scale = 1.02,
  glare = true,
  radius = 'rounded-3xl',
  ...rest
}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);

  // Normalised pointer position within the card, -0.5 to 0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 260, damping: 22, mass: 0.5 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  // Y rotation follows horizontal travel; X rotation is inverted so the card
  // leans toward the pointer rather than away from it.
  const rotateY = useTransform(sx, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [maxTilt, -maxTilt]);

  const glareX = useTransform(sx, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(sy, [-0.5, 0.5], ['0%', '100%']);
  const glareOpacity = useMotionValue(0);

  function handleMove(e) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function handleEnter() {
    if (!reduce) glareOpacity.set(1);
  }

  function handleLeave() {
    px.set(0);
    py.set(0);
    glareOpacity.set(0);
  }

  // With reduced motion the card still responds, but only as a flat lift.
  if (reduce) {
    return (
      <div className={`${radius} ${className}`} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      whileHover={{ scale }}
      transition={{ type: 'spring', ...spring }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        // Perspective must live on this element, not the parent, or sibling
        // cards would share one vanishing point and tilt toward each other.
        perspective: 1000,
      }}
      className={`relative ${radius} ${className}`}
      {...rest}
    >
      {children}

      {glare ? (
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${radius} overflow-hidden`}
          style={{ opacity: glareOpacity, transition: 'opacity 300ms' }}
        >
          <motion.div
            className="absolute h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2"
            style={{
              left: glareX,
              top: glareY,
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.28) 0%, transparent 62%)',
            }}
          />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
