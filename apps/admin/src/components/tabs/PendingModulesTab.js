import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
const subTabBtn = { padding: '0.5rem 1rem', background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' };
const subTabBtnActive = { ...subTabBtn, background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' };

export default function PendingModulesTab({ API_BASE, authHeaders }) {
  const [activeSubTab, setActiveSubTab] = useState('medical');
  const [data, setData] = useState({ doctors: [], jobs: [], properties: [], events: [], languages: [] });
  const [loading, setLoading] = useState(false);

  const fetchModuleData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'medical') {
        const res = await fetch(`${API_BASE}/medical/doctors`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          setData(prev => ({ ...prev, doctors: body.doctors || [] }));
        }
      } else if (activeSubTab === 'jobs') {
        const res = await fetch(`${API_BASE}/jobs/postings`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          setData(prev => ({ ...prev, jobs: body.jobs || [] }));
        }
      } else if (activeSubTab === 'properties') {
        const res = await fetch(`${API_BASE}/properties/listings`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          setData(prev => ({ ...prev, properties: body.properties || [] }));
        }
      } else if (activeSubTab === 'events') {
        const res = await fetch(`${API_BASE}/events/community`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          setData(prev => ({ ...prev, events: body.events || [] }));
        }
      } else if (activeSubTab === 'multilingual') {
        const res = await fetch(`${API_BASE}/multilingual/dictionary/hi`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          setData(prev => ({ ...prev, languages: Object.entries(body.dictionary || {}) }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch pending module data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModuleData();
  }, [activeSubTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>📦 Verticals & Pending Modules Command Center</h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>Operational management across Medical, Jobs, Properties, Events, and Regional Languages.</p>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
        {[
          { id: 'medical', label: '🩺 Medical & Doctors' },
          { id: 'jobs', label: '💼 Local Job Postings' },
          { id: 'properties', label: '🏠 Real Estate Properties' },
          { id: 'events', label: '🎪 Community Events' },
          { id: 'multilingual', label: '🌐 Regional Languages (i18n)' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            style={activeSubTab === t.id ? subTabBtnActive : subTabBtn}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Render Sub-Tab Contents */}
      {activeSubTab === 'medical' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#38bdf8' }}>🩺 Medical Doctors & Clinics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Doctor Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Specialization</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Hospital</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Fee</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.doctors.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{d.name}</td>
                  <td style={{ padding: '0.75rem', color: '#38bdf8' }}>{d.specialization}</td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{d.hospital_name}</td>
                  <td style={{ padding: '0.75rem', color: '#4ade80', fontWeight: 700 }}>₹{d.consultation_fee}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ color: '#4ade80', fontWeight: 700 }}>ACTIVE</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'jobs' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#facc15' }}>💼 Active Job Listings</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Job Title</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Company</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Salary Range</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Pincode</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map(j => (
                <tr key={j.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{j.title}</td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{j.company_name}</td>
                  <td style={{ padding: '0.75rem', color: '#4ade80', fontWeight: 700 }}>{j.salary_range}</td>
                  <td style={{ padding: '0.75rem', color: '#38bdf8' }}>{j.location_pincode}</td>
                  <td style={{ padding: '0.75rem', color: '#facc15' }}>{j.job_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'properties' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#a855f7' }}>🏠 Real Estate Listings</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Listing</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {data.properties.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{p.title}</td>
                  <td style={{ padding: '0.75rem', color: '#38bdf8' }}>{p.property_type}</td>
                  <td style={{ padding: '0.75rem', color: '#facc15' }}>{p.listing_type}</td>
                  <td style={{ padding: '0.75rem', color: '#4ade80', fontWeight: 700 }}>₹{p.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'events' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#ec4899' }}>🎪 Community Events</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Event Title</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Date & Time</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Ticket Fee</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{e.title}</td>
                  <td style={{ padding: '0.75rem', color: '#ec4899' }}>{e.category}</td>
                  <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{e.event_date} ({e.time_slot})</td>
                  <td style={{ padding: '0.75rem', color: '#4ade80', fontWeight: 700 }}>{e.ticket_price === 0 ? 'FREE' : `₹${e.ticket_price}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'multilingual' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#10b981' }}>🌐 Regional Hindi (hi) i18n Translations</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Translation Key</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#94a3b8' }}>Hindi Value</th>
              </tr>
            </thead>
            <tbody>
              {data.languages.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>{k}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
