import React, { useState, useEffect } from 'react';

const columnStyle = { flex: 1, background: '#0f172a', padding: '1rem', borderRadius: '1rem', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '240px' };
const cardStyle = { background: '#1e293b', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const btnAction = { padding: '0.35rem 0.7rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.4rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' };

export default function LeadsCRMTab({ API_BASE, authHeaders }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/franchise/leads`, { headers: authHeaders() });
      const data = await res.json();
      setLeads(data.leads || data.data || []);
    } catch (e) {
      console.error('Failed to fetch CRM leads:', e);
      setLeads([
        { id: 'l1', business_name: 'Gupta Kirana Store', category: 'Grocery', phone: '+91 98220 11990', status: 'SCRAPED' },
        { id: 'l2', business_name: 'Dhanori Medicals', category: 'Pharmacy', phone: '+91 99120 33881', status: 'CONTACTED' },
        { id: 'l3', business_name: 'Baner Hardware & Tools', category: 'Retail', phone: '+91 97660 55412', status: 'VERIFIED' }
      ]);
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
