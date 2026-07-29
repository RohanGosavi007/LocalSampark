'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Micro-animation for checkout success states using Framer Motion.
 */
export const ConfettiSuccess = () => {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    // Generate 30 random confetti pieces
    const newPieces = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1,
      color: ['#00B074', '#FF5E00', '#FFD600', '#E52E2E'][Math.floor(Math.random() * 4)]
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.x, y: p.y, rotate: p.rotation, scale: p.scale, opacity: 1 }}
          animate={{
            y: window.innerHeight + 100,
            rotate: p.rotation + 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: [1, 1, 0]
          }}
          transition={{ duration: 2 + Math.random() * 2, ease: "easeOut" }}
          style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}
    </div>
  );
};
