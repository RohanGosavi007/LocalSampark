import React from 'react';

export default function POSManager({ shop }) {
  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2>📠 Point of Sale (POS) Terminal</h2>
        <div style={{ background: '#dcfce7', color: '#166534', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold' }}>
          Live Register Mode
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <input type="text" className="form-input" placeholder="Scan Barcode or Search Item..." style={{ flex: 1 }} />
            <button className="btn btn-primary">🔍</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* Mock Quick Items */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--background)' }}>
                <div style={{ fontSize: '2rem' }}>📦</div>
                <div style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>Quick Item {i}</div>
                <div style={{ color: 'var(--primary)' }}>₹150</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Current Order</h3>
          <div style={{ minHeight: '200px', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No items scanned yet</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            <span>Total</span>
            <span>₹0.00</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>💳 Pay via Card</button>
          <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>💵 Cash</button>
          <button className="btn btn-secondary" style={{ width: '100%' }}>📱 Send Payment Link</button>
        </div>
      </div>
    </div>
  );
}
