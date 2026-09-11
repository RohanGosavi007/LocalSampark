import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

export default function EventsTab({ API_BASE, authHeaders }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/events`, { headers: authHeaders() });
      setEvents(data.events || data.data || []);
    } catch (e) {
      console.error('Failed to fetch events:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>🎉 Local Events & Ticketing Audit</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Review society gatherings, local workshops, and ticket capacity limits.</p>
          </div>
          <button onClick={fetchEvents} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Event Title', 'Category', 'Date & Time', 'Venue', 'Ticket Price', 'Capacity', 'Status'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No upcoming local events found.</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>{e.title}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{e.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{e.event_date} @ {e.event_time}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{e.venue}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#4ade80', fontWeight: 700 }}>₹{e.ticket_price}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#f59e0b', fontWeight: 700 }}>{e.available_tickets} / {e.total_capacity} left</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: '#052e16', color: '#4ade80', padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 }}>
                      Active
                    </span>
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
