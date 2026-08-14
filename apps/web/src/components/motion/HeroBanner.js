'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from 'framer-motion';

/**
 * HeroBanner
 *
 * A hero with drifting aurora fields behind a per-word text reveal, plus a
 * parallax response to scroll.
 *
 * Motion here is deliberately large, so every animation is gated on
 * useReducedMotion. When the OS asks for reduced motion the content still
 * renders in full; it simply arrives without travel.
 */

// ─── Variants ────────────────────────────────────────────────────────────────

const containerVariants = (stagger) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: 0.12 },
  },
});

// Words rise from behind a clipping mask, which reads as typesetting rather
// than a plain fade.
const wordVariants = (reduce) => ({
  hidden: reduce
    ? { opacity: 0 }
    : { opacity: 0, y: '110%', rotate: 4 },
  visible: {
    opacity: 1,
    y: '0%',
    rotate: 0,
    transition: reduce
      ? { duration: 0.2 }
      : { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
  },
});

const fadeUp = (reduce, delay = 0) => ({
  hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: reduce ? 0.2 : 0.7, delay, ease: [0.16, 1, 0.3, 1] },
  },
});

// ─── Aurora field ────────────────────────────────────────────────────────────

function Aurora({ reduce }) {
  // Each blob drifts on its own period so the field never visibly loops.
  const blobs = [
    { c: 'rgba(0,200,128,0.55)', s: 'w-[46vw] h-[46vw]', p: 'top-[-12%] left-[-8%]', d: 22, delay: 0 },
    { c: 'rgba(124,92,255,0.50)', s: 'w-[40vw] h-[40vw]', p: 'top-[8%] right-[-10%]', d: 27, delay: 2 },
    { c: 'rgba(255,106,0,0.45)', s: 'w-[38vw] h-[38vw]', p: 'bottom-[-14%] left-[22%]', d: 31, delay: 4 },
    { c: 'rgba(0,217,245,0.42)', s: 'w-[32vw] h-[32vw]', p: 'bottom-[2%] right-[16%]', d: 25, delay: 1 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[90px] ${b.s} ${b.p}`}
          style={{ background: b.c, willChange: reduce ? 'auto' : 'transform' }}
          animate={
            reduce
              ? undefined
              : {
                  x: ['-6%', '7%', '-3%', '-6%'],
                  y: ['-4%', '5%', '8%', '-4%'],
                  scale: [1.1, 1.28, 1.16, 1.1],
                }
          }
          transition={
            reduce
              ? undefined
              : { duration: b.d, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}

      {/* Grain breaks up the banding that large soft gradients produce on
          8-bit displays. */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export default function HeroBanner({
  eyebrow = 'Your neighbourhood, connected',
  headline = 'Everything local. One app.',
  subhead = 'Shops, services and neighbours within walking distance — discovered, booked and delivered in minutes.',
  primaryCta = { label: 'Explore shops', href: '/shops' },
  secondaryCta = { label: 'List your shop', href: '/shop-registration' },
  children,
}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Spring-smoothed so parallax does not stutter against raw scroll deltas.
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.6 });
  const bgY = useTransform(smooth, [0, 1], ['0%', '28%']);
  const fgY = useTransform(smooth, [0, 1], ['0%', '-12%']);
  const fade = useTransform(smooth, [0, 0.8], [1, 0]);

  const words = headline.split(' ');

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-mesh-1 min-h-[86vh] flex items-center"
    >
      <motion.div
        className="absolute inset-0"
        style={reduce ? undefined : { y: bgY }}
      >
        <Aurora reduce={reduce} />
      </motion.div>

      <motion.div
        className="relative z-10 container max-w-6xl px-6 py-24"
        style={reduce ? undefined : { y: fgY, opacity: fade }}
        variants={containerVariants(reduce ? 0.02 : 0.06)}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp(reduce)}
          className="inline-flex items-center gap-2 rounded-full border border-glass-white-20 bg-glass-white-10 px-4 py-1.5 text-sm font-semibold text-white/85 backdrop-blur-xl"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary drop-shadow-emerald" />
          {eyebrow}
        </motion.p>

        <h1 className="mt-7 font-heading text-5xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
          {words.map((word, i) => (
            // The mask must clip, so each word needs its own overflow-hidden
            // wrapper; clipping the whole line would hide descenders.
            <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span
                variants={wordVariants(reduce)}
                className={`inline-block ${
                  i >= words.length - 2 ? 'text-holo' : ''
                }`}
              >
                {word}
                {i < words.length - 1 ? ' ' : ''}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          variants={fadeUp(reduce, 0.1)}
          className="mt-7 max-w-2xl text-lg leading-relaxed text-white/70"
        >
          {subhead}
        </motion.p>

        <motion.div variants={fadeUp(reduce, 0.18)} className="mt-10 flex flex-wrap gap-4">
          <motion.a
            href={primaryCta.href}
            whileHover={reduce ? undefined : { scale: 1.04, y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="group relative overflow-hidden rounded-full bg-primary px-8 py-4 font-bold text-mesh-1 shadow-emerald-glow"
          >
            <span className="relative z-10">{primaryCta.label}</span>
            {/* Sheen sweep on hover. */}
            <span className="absolute inset-0 -translate-x-[120%] skew-x-[-18deg] bg-white/30 transition-transform duration-700 group-hover:translate-x-[220%]" />
          </motion.a>

          <motion.a
            href={secondaryCta.href}
            whileHover={reduce ? undefined : { scale: 1.04, y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="rounded-full border border-glass-white-20 bg-glass-white-10 px-8 py-4 font-bold text-white backdrop-blur-xl hover:bg-glass-white-20"
          >
            {secondaryCta.label}
          </motion.a>
        </motion.div>

        {children ? (
          <motion.div variants={fadeUp(reduce, 0.26)} className="mt-14">
            {children}
          </motion.div>
        ) : null}
      </motion.div>
    </section>
  );
}
