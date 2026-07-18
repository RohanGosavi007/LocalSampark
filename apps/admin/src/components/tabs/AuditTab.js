import React, { useState, useEffect } from 'react';

const StatusBadge = ({ status }) => {
  const map = {
    'Active': { bg: '#052e16', color: '#4ade80' },
    'Pending': { bg: '#431407', color: '#fb923c' },
    'Suspended': { bg: '#450a0a', color: '#f87171' },
  };
  const style = map[status] || { bg: '#1e293b', color: '#94a3b8' };
  return (
    <span style={{ background: style.bg, color: style.color, padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
};

export default function AuditTab({ API_BASE, authHeaders }) {
  const [adminAuditLogs, setAdminAuditLogs] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/admin/audit`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setAdminAuditLogs(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])))
      .catch(console.error);
  }, [API_BASE, authHeaders]);

  const loadLogs = async () => {
    try { 
      const r = await fetch(`${API_BASE}/admin/audit`, { headers: authHeaders() }); 
      let data = await r.json(); 
      setAdminAuditLogs(Array.isArray(data) ? data : []);
    } catch(e){ console.error(e); }
  };

  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>📋 Admin Audit Trail</h3>
          <button onClick={loadLogs} style={btnPrimary}>Load Audit Logs</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #334155' }}>
              {['Admin', 'Action', 'Target', 'IP Address', 'Timestamp'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {adminAuditLogs.length === 0 ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Click "Load Audit Logs" to view admin activity history.</td></tr> : adminAuditLogs.map((log, i) => (
                <tr key={log.id || i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{log.admin_name || log.admin_id || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={log.action === 'login' ? 'Active' : log.action === 'delete' ? 'Suspended' : 'Pending'} /></td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{log.target_type}: {log.target_id ? (typeof log.target_id === 'string' ? log.target_id.slice(0,8) : log.target_id) : '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{log.ip_address || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
