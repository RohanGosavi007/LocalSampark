import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: 'var(--danger)' };
const btnSuccess = { ...btnPrimary, background: 'var(--success)' };

export default function MarketplaceTab({ API_BASE, authHeaders }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/marketplace/products?limit=50`, { headers: authHeaders() });
      setDataList(data.data || data.items || data.records || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>🛒 Marketplace Audit</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Audit product listings from local shops, verify pricing, check image quality, and ensure category compliance.</p>
          </div>
          <button onClick={fetchData} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Product Name', 'Shop', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataList.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No data found.</td></tr>
              ) : dataList.map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--ink)' }}>{item.title || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>Seller ID: {item.seller_id || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-subtle)' }}>{item.category || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--success)', fontWeight: 700 }}>₹{item.price || 0}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{item.condition || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: item.status === 'active' ? 'var(--success-quiet)' : 'var(--accent-quiet)', 
                      color: item.status === 'active' ? 'var(--success)' : 'var(--accent-text)', 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 
                    }}>
                      {item.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button style={{ ...btnDanger, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
