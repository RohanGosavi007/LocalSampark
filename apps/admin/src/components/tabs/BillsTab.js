'use client';
import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

export default function BillsTab({ API_BASE, authHeaders }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/bills`, {
        headers: authHeaders()
      });
      if (data.bills) setBills(data.bills);
    } catch (error) {
      console.error('Failed to fetch bill transactions:', error);
      setError(error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>🧾 Utility Bill Payments & Settlements</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Electricity, Water, DTH, and Society Maintenance transactions.</p>
          </div>
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{bills.length} Transactions</span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Loading bill ledger...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Transaction ID</th>
                  <th style={thStyle}>Biller / Service</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--ink-subtle)', padding: '2rem' }}>
                      No utility bill transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{b.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>{b.created_at}</div>
                      </td>
                      <td style={tdStyle}>{b.biller_name}</td>
                      <td style={tdStyle}>₹{b.amount}</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          SUCCESS
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
