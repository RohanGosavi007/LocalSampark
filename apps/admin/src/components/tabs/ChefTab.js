import React from 'react';

export default function ChefTab({ API_BASE, authHeaders }) {
  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>👨‍🍳 Home Chef & Tiffin Services</h3>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>0 Active Chefs</span>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>The Home Chef module is currently being connected to the new APIs.</p>
        </div>
      </div>
    </div>
  );
}
