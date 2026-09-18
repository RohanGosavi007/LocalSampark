'use client';
import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../lib/api';
export default function AuditLogPage() {
  const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost') 
    ? 'https://localsampark-api.onrender.com/api/v1' 
    : (process.env.NEXT_PUBLIC_API_URL || 'https://localsampark-api.onrender.com') + '/api/v1';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No Authorization header: the session is an httpOnly cookie that the
    // patched fetch in AdminAuthContext attaches (with its CSRF header) to any
    // request aimed at our API. Reading 'admin_token' from localStorage here
    // produced the literal string "Bearer null" once the token stopped being
    // stored there.
    fetch(`${API_BASE}/admin/audit`, { headers: getAuthHeaders() })
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
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--ink)', background: 'var(--ground)', minHeight: '100vh', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <a href="/" style={{ color: 'var(--success)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>← Back to Dashboard</a>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0 }}>System Audit Logs</h1>
        </div>
        <span style={{ background: 'var(--surface-1)', color: 'var(--ink-muted)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>{logs.length} logs</span>
      </div>
      
      {loading ? <p>Loading audit logs...</p> : (
        <div style={{ background: 'var(--surface-1)', borderRadius: '1rem', border: '1px solid var(--line)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--ink-muted)' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--ink-muted)' }}>Admin</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--ink-muted)' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--ink-muted)' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '1rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{log.admin_name || log.admin_id}</td>
                  <td style={{ padding: '1rem', color: 'var(--success)' }}>{log.action}</td>
                  <td style={{ padding: '1rem', color: 'var(--ink-subtle)' }}>{log.ip_address}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No audit logs recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
