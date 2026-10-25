'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function CRMRevenuePage() {
  const [rateInput, setRateInput] = useState('30');
  const [platformShare, setPlatformShare] = useState(40);
  const [franchiseShare, setFranchiseShare] = useState(30);

  const mockTransactions = [
    { id: 1, type: 'Shop Listing (Sharma Dairy)', gross: 999.00, dev: '₹399.60', partner: '₹299.70', status: 'Completed' },
    { id: 2, type: 'Delivery Fee (Run #420)', gross: 40.00, dev: '₹16.00', partner: '₹12.00', status: 'Completed' }
  ];

  const handleRateUpdate = (e) => {
    e.preventDefault();
    alert(`Commission policy updated! New rates applied: Dev ${platformShare}%, Franchise ${franchiseShare}%`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2.5rem' }}>
            <a href="/crm" style={{ fontSize: '1.25rem' }}>⬅️</a>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Platform Revenue Split & Policy CRM</h1>
          </div>

          <div className="grid-2" style={{ gap: '2rem', alignItems: 'stretch', marginBottom: '3rem' }}>
            {/* Global Settings */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1rem' }}>Adjust Split Policies</h3>
              <form onSubmit={handleRateUpdate}>
                <div className="form-group">
                  <label className="form-label">Platform Dev Share (%)</label>
                  <input type="number" className="form-input" value={platformShare} onChange={(e) => setPlatformShare(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Franchise Partner Share (%)</label>
                  <input type="number" className="form-input" value={franchiseShare} onChange={(e) => setFranchiseShare(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Update Payout Policy</button>
              </form>
            </div>

            {/* Split rules */}
            <div className="glass-card" style={{ background: 'var(--primary-light)', border: 'none' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Split Payout Guidelines</h3>
              <div style={{ fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p>• **Platform Developer (40%)**: Core API infrastructure, hosting, and upgrades</p>
                <p>• **Franchise Partner (30%)**: Merchant onboarding and territory operations</p>
                <p>• **User Rewards (20%)**: Referral loops, points redemption</p>
                <p>• **Reserve Fund (10%)**: Emergency SOS and community project contributions</p>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Revenue Transaction split Ledger</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem' }}>Transaction</th>
                    <th style={{ padding: '1rem' }}>Gross Amount</th>
                    <th style={{ padding: '1rem' }}>Dev Share (40%)</th>
                    <th style={{ padding: '1rem' }}>Partner Share (30%)</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTransactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{tx.type}</td>
                      <td style={{ padding: '1rem' }}>₹{tx.gross.toFixed(2)}</td>
                      <td style={{ padding: '1rem', color: 'var(--primary)' }}>{tx.dev}</td>
                      <td style={{ padding: '1rem', color: 'var(--secondary)' }}>{tx.partner}</td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-success">{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
