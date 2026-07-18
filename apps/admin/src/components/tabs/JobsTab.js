import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: '#ef4444' };

export default function JobsTab({ API_BASE, authHeaders }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/skilled-bookings`, { headers: authHeaders() });
      const data = await res.json();
      setJobs(data.data || data.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await fetch(`${API_BASE}/admin/jobs/${id}`, { method: 'DELETE', headers: authHeaders() });
      fetchJobs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>💼 Jobs & Services Management</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Review, approve, or reject job postings and service listings from local professionals.</p>
          </div>
          <button onClick={fetchJobs} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Title', 'Provider', 'Category', 'Salary/Price', 'Location', 'Status', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No jobs found.</td></tr>
              ) : jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>{job.title || 'Untitled'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{job.provider_name || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{job.category || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#4ade80' }}>₹{job.salary || job.price || 0}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{job.location || job.zone || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: job.is_active ? '#052e16' : '#431407', 
                      color: job.is_active ? '#4ade80' : '#fb923c', 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 
                    }}>
                      {job.is_active ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button onClick={() => handleDelete(job.id)} style={{ ...btnDanger, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Delete</button>
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
