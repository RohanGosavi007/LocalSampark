import React from 'react';
// No TabError here: this tab fires one-shot maintenance actions and reports
// each outcome in its own alert; it loads no data that could fail on mount.
import { fetchJson } from '../../lib/api';

export default function SettingsTab({ API_BASE, authHeaders }) {
  const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      {[
        { title: '📧 Email Notifications', desc: 'Configure SMTP and email alert triggers for critical platform events.', action: 'Configure Email' },
        { title: '🔔 Push Notifications', desc: 'Manage FCM push notification topics and scheduled broadcasts.', action: 'Manage FCM' },
        { title: '💳 Payment Gateway', desc: 'Update Razorpay API keys, webhook endpoints, and payout schedules.', action: 'Razorpay Settings' },
        { title: '🔒 Security & 2FA', desc: 'Manage admin 2FA, IP allowlist, and session timeout policies.', action: 'Security Panel' },
        { title: '📦 Data Export', desc: 'Export user, shop, and revenue data as CSV/Excel for reporting.', action: 'Export Data' },
        { title: '🧹 System Maintenance', desc: 'Clear expired stories, re-run DB migrations, and flush cache.', action: 'Run Maintenance' },
      ].map(s => (
        <div key={s.title} style={cardStyle}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{s.title}</h3>
          <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>{s.desc}</p>
          <button onClick={async () => {
            try {
              // Via fetchJson so a 401/500 actually throws. With bare fetch
              // this reported "triggered successfully!" for every failed
              // maintenance action, including ones the operator was not
              // authorised to run.
              await fetchJson(`${API_BASE}/admin/settings/action`, {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({ action: s.action })
              });
              alert(`${s.action} triggered successfully!`);
            } catch (e) { alert(`Failed to trigger ${s.action}: ${e.message}`); }
          }} style={btnPrimary}>{s.action}</button>
        </div>
      ))}
    </div>
  );
}
