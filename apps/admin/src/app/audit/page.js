'use client';
import React from 'react';
import AuditTab from '../../components/tabs/AuditTab';
import { API_BASE, getAuthHeaders } from '../../lib/api';

export default function AuditLogPage() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--ink)', background: 'var(--ground)', minHeight: '100vh', padding: '2rem' }}>
      <a href="/" style={{ color: 'var(--success)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block', marginBottom: '0.5rem' }}>← Back to console</a>
      <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 1.5rem' }}>System Audit Logs</h1>
      <AuditTab API_BASE={API_BASE} authHeaders={getAuthHeaders} />
    </div>
  );
}
