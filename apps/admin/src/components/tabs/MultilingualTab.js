import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };

export default function MultilingualTab({ API_BASE, authHeaders }) {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/multilingual/dictionary/hi`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          setLanguages(Object.entries(body.dictionary || {}));
        }
      } catch (e) {
        console.error('Failed to fetch dictionary:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchTranslations();
  }, [API_BASE, authHeaders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🌐 Regional Languages (i18n)</h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>Manage translations and regional language support for the platform.</p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#10b981' }}>Hindi (hi) Translations</h3>
        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading translations...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Translation Key</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Hindi Value</th>
              </tr>
            </thead>
            <tbody>
              {languages.length === 0 ? (
                <tr><td colSpan="2" style={{ padding: '0.75rem', color: '#94a3b8' }}>No translations found.</td></tr>
              ) : (
                languages.map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>{k}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{v}</td>
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
