import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

export default function AdCampaignsTab({ API_BASE, authHeaders }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [globalRadius, setGlobalRadius] = useState(4); // Default 4km
  const [formData, setFormData] = useState({ shop_id: '', budget_amount: 500, radius_km: 4, duration_days: 7 });
  const [error, setError] = useState(null);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--ground)', border: '1px solid var(--line)', color: 'var(--ink)', marginBottom: '1rem' };

  useEffect(() => {
    fetchFeaturedShops();
  }, [globalRadius]);

  const fetchFeaturedShops = async () => {
    try {
      setLoading(true);
      setError(null);
      // Calls our new AdService route
      const data = await fetchJson(`${API_BASE}/campaigns/geo-feed?lat=18.5912&lng=73.9015&radiusKm=${globalRadius}`, {
        headers: { ...(typeof authHeaders === 'function' ? authHeaders() : authHeaders) }
      });
      setCampaigns(data.ads || []);
    } catch (err) {
      console.error('Error fetching ad campaigns:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalRadius = async (val) => {
    setGlobalRadius(val);
    // Note: In a full app, we would POST this to a /settings API to persist `default_ad_radius_km`
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchJson(`${API_BASE}/campaigns/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof authHeaders === 'function' ? authHeaders() : authHeaders) },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert(data.message || 'Ad Campaign Purchased!');
        setShowModal(false);
        fetchFeaturedShops();
      } else {
        alert(data.error || 'Failed to purchase campaign.');
      }
    } catch (err) {
      alert('Error creating campaign: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--ink)' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      {/* Header Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid var(--info)' }}>
          <div style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>Active Ad Campaigns</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.2rem' }}>{campaigns.length}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid var(--success)' }}>
          <div style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>Total Ad Spend (Monthly)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>₹48,500</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid var(--accent)' }}>
          <div style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>Global Geofence Radius</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-text)', marginTop: '0.2rem' }}>{globalRadius}.0 km</div>
          <input 
            type="range" 
            min="1" max="20" 
            value={globalRadius} 
            onChange={(e) => handleUpdateGlobalRadius(parseInt(e.target.value))}
            style={{ width: '100%', marginTop: '0.5rem' }} 
          />
        </div>
      </div>

      {/* Main Campaign Management */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>📢 Geofenced Ad Campaigns & Boosts</h3>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>Manage local 2km radius shop promotions and featured badge auctions</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: 'var(--info)', color: 'var(--ink)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Create Campaign Boost
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-muted)' }}>Loading active ad campaigns...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Shop Name</th>
                <th style={{ padding: '0.75rem' }}>Budget</th>
                <th style={{ padding: '0.75rem' }}>Distance</th>
                <th style={{ padding: '0.75rem' }}>Impressions / Clicks</th>
                <th style={{ padding: '0.75rem' }}>CTR</th>
                <th style={{ padding: '0.75rem' }}>Ad Rank Score</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No active campaigns in this radius.</td>
                </tr>
              ) : (
                campaigns.map(c => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : 0;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>{c.shop_name || c.title || 'Local Shop'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--ink)' }}>₹{c.spent} / ₹{c.budget}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--ink-muted)' }}>{c.distance_km} km</td>
                      <td style={{ padding: '0.75rem', color: 'var(--ink)' }}>{c.impressions || 0} / {c.clicks || 0}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--info)' }}>{ctr}%</td>
                      <td style={{ padding: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>{c.rank_score}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Ad Creation */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: '400px', background: 'var(--ground)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Create Featured Ad Boost</h3>
            <form onSubmit={handleCreateAd}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Shop ID / Identifier</label>
              <input type="text" value={formData.shop_id} onChange={e => setFormData({...formData, shop_id: e.target.value})} placeholder="e.g. shop_01" style={inputStyle} required />

              <label style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Ad Budget (₹)</label>
              <input type="number" value={formData.budget_amount} onChange={e => setFormData({...formData, budget_amount: parseInt(e.target.value)})} style={inputStyle} required />

              <label style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>Target Radius (km)</label>
              <input type="number" value={formData.radius_km} onChange={e => setFormData({...formData, radius_km: parseInt(e.target.value)})} style={inputStyle} required />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'var(--surface-2)', color: 'var(--ink)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'var(--success)', color: 'var(--on-solid)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Purchase Boost</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
