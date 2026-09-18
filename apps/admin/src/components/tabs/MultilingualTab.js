import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };

export default function MultilingualTab({ API_BASE, authHeaders }) {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      setError(null);
      try {
        // Was `if (res.ok) { ... }` with no else, so a failed load silently
        // rendered an empty dictionary.
        const body = await fetchJson(`${API_BASE}/multilingual/dictionary/hi`, { headers: authHeaders() });
        setLanguages(Object.entries(body.dictionary || {}));
      } catch (e) {
        console.error('Failed to fetch dictionary:', e);
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTranslations();
  }, [API_BASE, authHeaders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🌐 Regional Languages (i18n)</h2>
        <p style={{ color: 'var(--ink-muted)', margin: 0 }}>Manage translations and regional language support for the platform.</p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--success)' }}>Hindi (hi) Translations</h3>
        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Loading translations...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--ink-muted)' }}>Translation Key</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--ink-muted)' }}>Hindi Value</th>
              </tr>
            </thead>
            <tbody>
              {languages.length === 0 ? (
                <tr><td colSpan="2" style={{ padding: '0.75rem', color: 'var(--ink-muted)' }}>No translations found.</td></tr>
              ) : (
                languages.map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: 'var(--info)' }}>{k}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--ink)' }}>{v}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
