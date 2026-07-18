import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: '#ef4444' };
const btnSuccess = { ...btnPrimary, background: '#10b981' };

export default function DeliveryTab({ API_BASE, authHeaders }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/delivery/agents`, { headers: authHeaders() });
      const data = await res.json();
      setAgents(data.data || data.agents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await fetch(`${API_BASE}/admin/delivery/agents/${id}/status`, { 
        method: 'PUT', 
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      fetchAgents();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>🚴 Delivery Fleet Management</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Onboard delivery agents, verify documents, track live fleet status, and monitor delivery performance across zones.</p>
          </div>
          <button onClick={fetchAgents} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Agent Name', 'Phone', 'Zone', 'Vehicle', 'Status', 'Total Deliveries', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No delivery agents found.</td></tr>
              ) : agents.map((agent) => (
                <tr key={agent.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>{agent.name || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{agent.phone || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{agent.zone || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{agent.vehicle_type || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: agent.status === 'active' ? '#052e16' : (agent.status === 'pending' ? '#431407' : '#1e1b4b'), 
                      color: agent.status === 'active' ? '#4ade80' : (agent.status === 'pending' ? '#fb923c' : '#a5b4fc'), 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 
                    }}>
                      {agent.status === 'active' ? 'Active' : (agent.status === 'pending' ? 'Pending' : 'Offline')}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{agent.total_deliveries || 0}</td>
                  <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.5rem' }}>
                    {agent.status === 'pending' && (
                      <button onClick={() => handleStatusChange(agent.id, 'active')} style={{ ...btnSuccess, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Approve</button>
                    )}
                    <button onClick={() => handleStatusChange(agent.id, 'suspended')} style={{ ...btnDanger, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
