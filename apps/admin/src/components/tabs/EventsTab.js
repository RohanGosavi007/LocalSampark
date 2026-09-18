import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

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
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--ink)' }}>🎉 Local Events & Ticketing Audit</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Review society gatherings, local workshops, and ticket capacity limits.</p>
          </div>
          <button onClick={fetchEvents} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Event Title', 'Category', 'Date & Time', 'Venue', 'Ticket Price', 'Capacity', 'Status'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No upcoming local events found.</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--ink)' }}>{e.title}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{e.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink)' }}>{e.event_date} @ {e.event_time}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{e.venue}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--success)', fontWeight: 700 }}>₹{e.ticket_price}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--warning)', fontWeight: 700 }}>{e.available_tickets} / {e.total_capacity} left</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: 'var(--success-quiet)', color: 'var(--success)', padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 }}>
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
