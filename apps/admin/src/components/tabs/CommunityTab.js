import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: '#ef4444' };
const btnSuccess = { ...btnPrimary, background: '#10b981' };

export default function CommunityTab({ API_BASE, authHeaders }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/community/posts?limit=50`, { headers: authHeaders() });
      const data = await res.json();
      setDataList(data.data || data.items || data.records || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>📢 Community Moderation</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Moderate townsquare posts, announcements, and local discussions. Review reported content.</p>
          </div>
          <button onClick={fetchData} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Post ID', 'Author', 'Content Preview', 'Reports', 'Status', 'Date', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataList.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No data found.</td></tr>
              ) : dataList.map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>{item.id?.substring(0,8) || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{item.user_name || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.content || '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{item.report_count || 0}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: item.status === 'active' ? '#052e16' : '#431407', 
                      color: item.status === 'active' ? '#4ade80' : '#fb923c', 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 
                    }}>
                      {item.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.5rem' }}>
                    <button style={{ ...btnSuccess, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>View</button>
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
