import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: 'var(--danger)' };
const btnSuccess = { ...btnPrimary, background: 'var(--success)' };

export default function CRMTab({ API_BASE, authHeaders }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/crm/leads`, { headers: authHeaders() });
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
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>📈 CRM & User Engagement</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Track user engagement metrics, manage push notification campaigns, and analyze retention.</p>
          </div>
          <button onClick={fetchData} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Lead ID', 'Name', 'Phone', 'Source', 'Status', 'Date', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataList.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No data found.</td></tr>
              ) : dataList.map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--ink)' }}>{item.id?.substring(0,8) || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{item.name || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{item.phone || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-subtle)' }}>{item.source || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: item.status === 'converted' ? 'var(--success-quiet)' : 'var(--accent-quiet)', 
                      color: item.status === 'converted' ? 'var(--success)' : 'var(--accent-text)', 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 
                    }}>
                      {item.status || 'New'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-subtle)' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.5rem' }}>
                    <button style={{ ...btnSuccess, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Convert</button>
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
