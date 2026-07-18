'use client';
import React, { useRef, useEffect } from 'react';

export default function HeroParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth || 400);
    let height = (canvas.height = 350);

    // Particle class for 3D simulation projection
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = (Math.random() - 0.5) * 300;
        this.y = (Math.random() - 0.5) * 300;
        this.z = Math.random() * 300 + 100; // Depth
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.vz = -Math.random() * 0.5 - 0.2; // Move closer
        this.color = Math.random() > 0.5 ? '#4f46e5' : '#f97316';
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        if (this.z <= 0) {
          this.reset();
        }
      }

      draw() {
        // Perspective projection calculation
        const k = 200 / this.z;
        const px = this.x * k + width / 2;
        const py = this.y * k + height / 2;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath();
          ctx.arc(px, py, this.size * k, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.globalAlpha = Math.min(1, (400 - this.z) / 300);
          ctx.fill();
        }
      }
    }

    const particles = Array.from({ length: 120 }, () => new Particle());

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth || 400;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        display: 'block',
        width: '100%',
        height: '350px',
        borderRadius: '1.25rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px dashed var(--border)'
      }}
    />
  );
}
