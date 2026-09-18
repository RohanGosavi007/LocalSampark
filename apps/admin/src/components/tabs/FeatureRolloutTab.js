import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.5rem 1rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnSuccess = { ...btnPrimary, background: 'var(--success)' };
const btnDanger = { ...btnPrimary, background: 'var(--danger)' };

export default function FeatureRolloutTab({ API_BASE, authHeaders }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      // Was `if (res.ok) { ... }` with no else, so a 401 or 500 left the list
      // empty and reported nothing. fetchJson throws instead.
      const data = await fetchJson(`${API_BASE}/gtm/admin/features`, { headers: authHeaders() });
      setFeatures(data.features || []);
    } catch (e) {
      console.error('Failed to fetch GTM features:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleToggle = async (feature) => {
    setSavingKey(feature.feature_key);
    try {
      const newEnabled = !feature.is_enabled;
      const res = await fetch(`${API_BASE}/gtm/admin/features/${feature.feature_key}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          is_enabled: newEnabled,
          allowed_pincodes: feature.allowed_pincodes || [],
          coming_soon_headline: feature.coming_soon_headline,
          coming_soon_message: feature.coming_soon_message
        })
      });

      if (res.ok) {
        setFeatures(prev => prev.map(f => f.feature_key === feature.feature_key ? { ...f, is_enabled: newEnabled } : f));
      }
    } catch (e) {
      alert(`Failed to update feature: ${e.message}`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateDetails = async (feature_key, pincodesStr, headline, message) => {
    setSavingKey(feature_key);
    try {
      const pincodesArray = pincodesStr.split(',').map(p => p.trim()).filter(Boolean);
      const res = await fetch(`${API_BASE}/gtm/admin/features/${feature_key}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          allowed_pincodes: pincodesArray,
          coming_soon_headline: headline,
          coming_soon_message: message
        })
      });

      if (res.ok) {
        alert(`Rollout settings saved for '${feature_key}'!`);
        fetchFeatures();
      }
    } catch (e) {
      alert(`Failed to save settings: ${e.message}`);
    } finally {
      setSavingKey(null);
    }
  };

  const phaseGrouped = {
    1: { name: 'Phase 1: The Wedge (Months 1-3)', color: 'var(--info)', items: features.filter(f => f.phase === 1) },
    2: { name: 'Phase 2: The Expansion (Months 4-8)', color: 'var(--warning)', items: features.filter(f => f.phase === 2) },
    3: { name: 'Phase 3: The Super-App (Months 9-12)', color: 'var(--accent-text)', items: features.filter(f => f.phase === 3) }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🚀 10x Go-To-Market Launch Control Center</h2>
          <p style={{ color: 'var(--ink-muted)', margin: 0 }}>Dynamically control module availability, hyper-local beta pincodes, and 'Coming Soon' experiences.</p>
        </div>
        <button onClick={fetchFeatures} style={btnPrimary}>{loading ? 'Refreshing...' : 'Refresh Matrix'}</button>
      </div>

      {Object.entries(phaseGrouped).map(([phaseNum, phase]) => (
        <div key={phaseNum} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: phase.color }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: phase.color }}>{phase.name}</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {phase.items.map(feature => (
              <FeatureCard 
                key={feature.feature_key} 
                feature={feature} 
                onToggle={() => handleToggle(feature)}
                onSaveDetails={(pincodes, headline, msg) => handleUpdateDetails(feature.feature_key, pincodes, headline, msg)}
                isSaving={savingKey === feature.feature_key}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ feature, onToggle, onSaveDetails, isSaving }) {
  const [pincodes, setPincodes] = useState((feature.allowed_pincodes || []).join(', '));
  const [headline, setHeadline] = useState(feature.coming_soon_headline || '');
  const [message, setMessage] = useState(feature.coming_soon_message || '');
  const [error, setError] = useState(null);

  return (
    <div style={{ ...cardStyle, borderLeft: feature.is_enabled ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--ink)' }}>{feature.title}</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)', fontFamily: 'monospace' }}>{feature.feature_key}</span>
        </div>
        <button 
          onClick={onToggle} 
          disabled={isSaving}
          style={feature.is_enabled ? btnSuccess : btnDanger}
        >
          {isSaving ? 'Updating...' : feature.is_enabled ? '● GLOBAL ACTIVE' : '○ LOCKED'}
        </button>
      </div>

      <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{feature.description}</p>

      {/* Config details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--ground)', padding: '1rem', borderRadius: '0.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
            Beta Pincodes (comma separated for soft-launch):
          </label>
          <input 
            type="text" 
            value={pincodes} 
            onChange={e => setPincodes(e.target.value)}
            placeholder="e.g. 411001, 411002"
            style={{ width: '100%', padding: '0.4rem', background: 'var(--surface-1)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: '0.25rem', fontSize: '0.8rem' }}
          />
        </div>

        {!feature.is_enabled && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                'Coming Soon' Modal Headline:
              </label>
              <input 
                type="text" 
                value={headline} 
                onChange={e => setHeadline(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', background: 'var(--surface-1)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: '0.25rem', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                'Coming Soon' Message Body:
              </label>
              <textarea 
                value={message} 
                onChange={e => setMessage(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.4rem', background: 'var(--surface-1)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: '0.25rem', fontSize: '0.8rem' }}
              />
            </div>
          </>
        )}

        <button 
          onClick={() => onSaveDetails(pincodes, headline, message)}
          disabled={isSaving}
          style={{ ...btnPrimary, marginTop: '0.5rem', alignSelf: 'flex-end', padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
        >
          Save Rollout Rules
        </button>
      </div>
    </div>
  );
}
