import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const columnStyle = { flex: 1, background: '#0f172a', padding: '1rem', borderRadius: '1rem', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '240px' };
const cardStyle = { background: '#1e293b', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const btnAction = { padding: '0.35rem 0.7rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.4rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' };

export default function LeadsCRMTab({ API_BASE, authHeaders }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/franchise/leads`, { headers: authHeaders() });
      setLeads(data.leads || data.data || []);
    } catch (e) {
      // This block used to be unparseable: a setError(e) call had been spliced
      // into the middle of the object literal below, between two array
      // elements. Nothing imports this component, so Next never compiled it and
      // the build stayed green while the file could not be parsed at all.
      //
      // The invented fallback leads are gone with it. Showing three fabricated
      // businesses ("Gupta Kirana Store", "Dhanori Medicals", ...) styled as
      // real CRM records meant an operator could call a prospect that does not
      // exist. A failed fetch is now reported as a failure.
      console.error('Failed to fetch CRM leads:', e);
      setError(e);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const moveLead = (id, newStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const stages = [
    { key: 'SCRAPED', title: '🔍 New Scraped Leads', color: '#94a3b8' },
    { key: 'CONTACTED', title: '📞 Pitch Contacted', color: '#38bdf8' },
    { key: 'VERIFIED', title: '🛡️ Claim Verified', color: '#f59e0b' },
    { key: 'SUBSCRIBED', title: '💎 Active SaaS Subscriber', color: '#4ade80' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0', color: '#f8fafc' }}>🎯 Franchise Lead Conversion Pipeline</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Convert scraped local merchant leads into active paying SaaS subscribers.</p>
        </div>
        <button onClick={fetchLeads} style={{ ...btnAction, padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>{loading ? 'Loading...' : 'Refresh Board'}</button>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {stages.map(stage => (
          <div key={stage.key} style={columnStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ color: stage.color, fontWeight: 700, fontSize: '0.85rem' }}>{stage.title}</span>
              <span style={{ background: '#334155', color: '#fff', borderRadius: '50px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
                {leads.filter(l => l.status === stage.key).length}
              </span>
            </div>

            {leads.filter(l => l.status === stage.key).map(lead => (
              <div key={lead.id} style={cardStyle}>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>{lead.business_name}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{lead.category} • {lead.phone}</div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {stage.key !== 'SUBSCRIBED' && (
                    <button 
                      onClick={() => moveLead(lead.id, stage.key === 'SCRAPED' ? 'CONTACTED' : stage.key === 'CONTACTED' ? 'VERIFIED' : 'SUBSCRIBED')}
                      style={btnAction}
                    >
                      Advance ➔
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
