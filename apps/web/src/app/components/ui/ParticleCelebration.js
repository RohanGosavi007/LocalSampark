'use client';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ParticleCelebration({ trigger }) {
  useEffect(() => {
    if (trigger) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FF6B00', '#00E676', '#00E5FF', '#FF007F', '#FFD600', '#10B981', '#6366F1']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FF6B00', '#00E676', '#00E5FF', '#FF007F', '#FFD600', '#10B981', '#6366F1']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      // Use matchMedia to respect reduced motion settings
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        frame();
      }
    }
  }, [trigger]);

  return null; // This is a logic-only component
}
