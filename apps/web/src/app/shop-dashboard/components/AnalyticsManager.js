import React from 'react';

export default function AnalyticsManager({ shop }) {
  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <div className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🧠</span> AI Smart Analytics
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Demand forecasting, review insights, and automated surge suggestions based on LocalSampark AI.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📈 Demand Forecast</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>High footfall expected this weekend due to local festival. We suggest enabling 1.5x Surge Pricing.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Apply Surge (1.5x)</button>
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>💬 Review Sentiment</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>85% positive sentiment. Top keywords: "fast service", "clean", "affordable".</p>
            <button className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Auto-Reply to Reviews</button>
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>⚡ Inventory Prediction</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>You usually run out of "Premium Shampoo" by Thursday. Reorder soon.</p>
            <button className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>One-Tap Reorder</button>
          </div>
        </div>
      </div>
    </div>
  );
}
