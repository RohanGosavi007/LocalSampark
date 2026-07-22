import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

export default function HomeServicesTab({ API_BASE, authHeaders }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/services/home-services/bookings`, { headers: authHeaders() });
      const data = await res.json();
      setBookings(data.bookings || data.data || []);
    } catch (e) {
      console.error('Failed to fetch home service bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>🔧 On-Demand Home Services Console</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Dispatch technicians, audit inspection fees, and review active service bookings.</p>
          </div>
          <button onClick={fetchBookings} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Ref #', 'Date & Slot', 'Address', 'Problem', 'Fee', 'Status'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No active technician bookings.</td></tr>
              ) : bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#6366f1' }}>{b.booking_ref}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#f8fafc' }}>{b.booking_date} ({b.time_slot})</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{b.service_address}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{b.problem_description || 'General Maintenance'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#4ade80', fontWeight: 700 }}>₹{b.inspection_fee}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: '#052e16', color: '#4ade80', padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 }}>
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
