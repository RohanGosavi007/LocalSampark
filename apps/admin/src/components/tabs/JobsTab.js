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
      const res = await fetch(`${API_BASE}/admin/jobs`, { headers: authHeaders() });
      const data = await res.json();
      setJobs(data.jobs || data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleApproval = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approvals/job/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setJobs(jobs.map(j => j.id === id ? { ...j, status } : j));
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>💼 Local Jobs & Micro-Gig Management</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Review, approve, or remove job postings from local employers and business vendors.</p>
          </div>
          <button onClick={fetchJobs} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Job Title', 'Category', 'Salary Range', 'Job Type', 'Address', 'Status', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No active job postings found.</td></tr>
              ) : jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>{job.title}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{job.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#4ade80', fontWeight: 700 }}>{job.salary_range}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{job.job_type}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{job.address}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: job.status === 'approved' ? '#052e16' : (job.status === 'rejected' ? '#450a0a' : '#431407'), 
                      color: job.status === 'approved' ? '#4ade80' : (job.status === 'rejected' ? '#f87171' : '#fb923c'), 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap'
                    }}>
                      {job.status ? job.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApproval(job.id, 'approved')} style={{...btnPrimary, background: '#10b981', padding: '0.4rem 0.8rem', fontSize: '0.75rem'}}>Approve</button>
                      <button onClick={() => handleApproval(job.id, 'rejected')} style={{...btnDanger, padding: '0.4rem 0.8rem', fontSize: '0.75rem'}}>Reject</button>
                    </div>
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
