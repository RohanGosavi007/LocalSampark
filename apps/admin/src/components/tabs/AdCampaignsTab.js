import React, { useState, useEffect } from 'react';

export default function AdCampaignsTab({ API_BASE, authHeaders }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [globalRadius, setGlobalRadius] = useState(4); // Default 4km
  const [formData, setFormData] = useState({ shop_id: '', budget_amount: 500, radius_km: 4, duration_days: 7 });

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', marginBottom: '1rem' };

  useEffect(() => {
    fetchFeaturedShops();
  }, [globalRadius]);

  const fetchFeaturedShops = async () => {
    try {
      setLoading(true);
      // Calls our new AdService route
      const res = await fetch(`${API_BASE}/campaigns/geo-feed?lat=18.5912&lng=73.9015&radiusKm=${globalRadius}`, {
        headers: { ...(typeof authHeaders === 'function' ? authHeaders() : authHeaders) }
      });
      const data = await res.json();
      setCampaigns(data.ads || []);
    } catch (err) {
      console.error('Error fetching ad campaigns:', err);
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
      const res = await fetch(`${API_BASE}/campaigns/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof authHeaders === 'function' ? authHeaders() : authHeaders) },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#fff' }}>
      {/* Header Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active Ad Campaigns</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.2rem' }}>{campaigns.length}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Ad Spend (Monthly)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>₹48,500</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Global Geofence Radius</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.2rem' }}>{globalRadius}.0 km</div>
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
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>Manage local 2km radius shop promotions and featured badge auctions</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Create Campaign Boost
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading active ad campaigns...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
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
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No active campaigns in this radius.</td>
                </tr>
              ) : (
                campaigns.map(c => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : 0;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>{c.shop_name || c.title || 'Local Shop'}</td>
                      <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>₹{c.spent} / ₹{c.budget}</td>
                      <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{c.distance_km} km</td>
                      <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{c.impressions || 0} / {c.clicks || 0}</td>
                      <td style={{ padding: '0.75rem', color: '#38bdf8' }}>{ctr}%</td>
                      <td style={{ padding: '0.75rem', color: '#34d399', fontWeight: 700 }}>{c.rank_score}</td>
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
          <div style={{ ...cardStyle, width: '400px', background: '#0f172a' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>Create Featured Ad Boost</h3>
            <form onSubmit={handleCreateAd}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Shop ID / Identifier</label>
              <input type="text" value={formData.shop_id} onChange={e => setFormData({...formData, shop_id: e.target.value})} placeholder="e.g. shop_01" style={inputStyle} required />

              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Ad Budget (₹)</label>
              <input type="number" value={formData.budget_amount} onChange={e => setFormData({...formData, budget_amount: parseInt(e.target.value)})} style={inputStyle} required />

              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Target Radius (km)</label>
              <input type="number" value={formData.radius_km} onChange={e => setFormData({...formData, radius_km: parseInt(e.target.value)})} style={inputStyle} required />

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Purchase Boost</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
