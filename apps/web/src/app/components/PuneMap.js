'use client';
import React, { useState, useRef, useEffect } from 'react';

export default function PuneMap({ onSelectZone }) {
  const canvasRef = useRef(null);
  const [hoveredZone, setHoveredZone] = useState(null);

  const zones = [
    { name: 'Dhanori', x: 200, y: 80, radius: 25, population: '85k', shops: 347, status: 'Active (Pilot)', color: '#4f46e5' },
    { name: 'Viman Nagar', x: 260, y: 130, radius: 20, population: '92k', shops: 210, status: 'Active (Pilot)', color: '#4f46e5' },
    { name: 'Kalyani Nagar', x: 220, y: 170, radius: 20, population: '78k', shops: 185, status: 'Active (Pilot)', color: '#4f46e5' },
    { name: 'Kharadi', x: 330, y: 150, radius: 22, population: '120k', shops: 430, status: 'Accepting Leads', color: '#f97316' },
    { name: 'Wakad', x: 60, y: 160, radius: 24, population: '140k', shops: 510, status: 'Accepting Leads', color: '#f97316' },
    { name: 'Hinjewadi', x: 40, y: 220, radius: 26, population: '180k', shops: 640, status: 'Accepting Leads', color: '#f97316' },
    { name: 'Baner', x: 100, y: 210, radius: 20, population: '110k', shops: 390, status: 'Accepting Leads', color: '#f97316' },
    { name: 'Aundh', x: 120, y: 150, radius: 20, population: '95k', shops: 320, status: 'Accepting Leads', color: '#f97316' }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, 400, 300);

      // Draw map background abstract grid
      ctx.strokeStyle = 'var(--border)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 400; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 300);
        ctx.stroke();
      }
      for (let j = 0; j < 300; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(400, j);
        ctx.stroke();
      }

      // Draw connections
      ctx.strokeStyle = 'var(--primary)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(200, 80);
      ctx.lineTo(260, 130);
      ctx.lineTo(220, 170);
      ctx.lineTo(330, 150);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw zones
      zones.forEach(zone => {
        const isHovered = hoveredZone && hoveredZone.name === zone.name;

        // Glow ring
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius + (isHovered ? 8 : 4), 0, Math.PI * 2);
        ctx.fillStyle = zone.color;
        ctx.globalAlpha = isHovered ? 0.25 : 0.1;
        ctx.fill();

        // Core circle
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = zone.color;
        ctx.globalAlpha = 1;
        ctx.fill();

        // Label
        ctx.fillStyle = 'var(--text)';
        ctx.font = 'bold 11px var(--font-heading)';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, zone.x, zone.y - zone.radius - 2);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hoveredZone]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const scaleX = 400 / rect.width;
    const scaleY = 300 / rect.height;
    const cx = mx * scaleX;
    const cy = my * scaleY;

    const found = zones.find(z => {
      const dist = Math.hypot(z.x - cx, z.y - cy);
      return dist <= z.radius + 10;
    });

    setHoveredZone(found || null);
  };

  const handleClick = () => {
    if (hoveredZone && onSelectZone) {
      onSelectZone(hoveredZone);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas 
        ref={canvasRef} 
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          display: 'block',
          width: '100%',
          height: '300px',
          background: 'var(--background)',
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          cursor: hoveredZone ? 'pointer' : 'default'
        }}
      />
      {hoveredZone && (
        <div className="glass-card" style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          padding: '0.75rem',
          fontSize: '0.8rem',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <strong>📍 {hoveredZone.name}</strong> ({hoveredZone.status})<br />
          Population: {hoveredZone.population} | Active Shops: {hoveredZone.shops}
        </div>
      )}
    </div>
  );
}
