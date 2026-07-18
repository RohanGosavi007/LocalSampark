'use client';
import React, { useState, useEffect } from 'react';
export default function AuditLogPage() {
  const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost') 
    ? 'https://localsampark-api.onrender.com/api/v1' 
    : (process.env.NEXT_PUBLIC_API_URL || 'https://localsampark-api.onrender.com') + '/api/v1';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/audit`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
      .then(r => r.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : (data.rows || []));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#f8fafc', background: '#0f172a', minHeight: '100vh', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <a href="/" style={{ color: '#4ade80', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>← Back to Dashboard</a>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0 }}>System Audit Logs</h1>
        </div>
        <span style={{ background: '#1e293b', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>{logs.length} logs</span>
      </div>
      
      {loading ? <p>Loading audit logs...</p> : (
        <div style={{ background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>Admin</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '1rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{log.admin_name || log.admin_id}</td>
                  <td style={{ padding: '1rem', color: '#4ade80' }}>{log.action}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{log.ip_address}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>No audit logs recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
