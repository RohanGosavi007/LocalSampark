import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

export default function HomeServicesTab({ API_BASE, authHeaders }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/services/home-services/bookings`, { headers: authHeaders() });
      setBookings(data.bookings || data.data || []);
    } catch (e) {
      console.error('Failed to fetch home service bookings:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--ink)' }}>🔧 On-Demand Home Services Console</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Dispatch technicians, audit inspection fees, and review active service bookings.</p>
          </div>
          <button onClick={fetchBookings} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Ref #', 'Date & Slot', 'Address', 'Problem', 'Fee', 'Status'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No active technician bookings.</td></tr>
              ) : bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-text)' }}>{b.booking_ref}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink)' }}>{b.booking_date} ({b.time_slot})</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{b.service_address}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink)' }}>{b.problem_description || 'General Maintenance'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--success)', fontWeight: 700 }}>₹{b.inspection_fee}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: 'var(--success-quiet)', color: 'var(--success)', padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {b.status}
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
