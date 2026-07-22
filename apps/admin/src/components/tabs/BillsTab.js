'use client';
import React, { useState, useEffect } from 'react';

export default function BillsTab({ API_BASE, authHeaders }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/bills`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.bills) setBills(data.bills);
    } catch (error) {
      console.error('Failed to fetch bill transactions:', error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>🧾 Utility Bill Payments & Settlements</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Electricity, Water, DTH, and Society Maintenance transactions.</p>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{bills.length} Transactions</span>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading bill ledger...</p>
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
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No utility bill transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{b.id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.created_at}</div>
                      </td>
                      <td style={tdStyle}>{b.biller_name}</td>
                      <td style={tdStyle}>₹{b.amount}</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
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
