import React from 'react';
export default function ShopChatManager() {
  return (
    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px' }}>
      <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>💬 Customer Chat</h3>
      <p style={{ color: '#94a3b8' }}>Please open the main Chat tab to interact with customers in real-time.</p>
      <button onClick={() => window.location.href = '/chat'} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '16px' }}>Go to Chat</button>
    </div>
  );
}
