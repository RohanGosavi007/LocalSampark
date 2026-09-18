import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: 'var(--danger)' };

export default function JobsTab({ API_BASE, authHeaders }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/jobs`, { headers: authHeaders() });
      setJobs(data.jobs || data.data || []);
    } catch (e) {
      console.error(e);
      setError(e);
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
    } catch (e) {
      console.error(e);
      setError(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--ink)' }}>💼 Local Jobs & Micro-Gig Management</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Review, approve, or remove job postings from local employers and business vendors.</p>
          </div>
          <button onClick={fetchJobs} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Job Title', 'Category', 'Salary Range', 'Job Type', 'Address', 'Status', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No active job postings found.</td></tr>
              ) : jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--ink)' }}>{job.title}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{job.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--success)', fontWeight: 700 }}>{job.salary_range}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-subtle)' }}>{job.job_type}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{job.address}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: job.status === 'approved' ? 'var(--success-quiet)' : (job.status === 'rejected' ? 'var(--danger-quiet)' : 'var(--warning-quiet)'), 
                      color: job.status === 'approved' ? 'var(--success)' : (job.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'), 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap'
                    }}>
                      {job.status ? job.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApproval(job.id, 'approved')} style={{...btnPrimary, background: 'var(--success)', padding: '0.4rem 0.8rem', fontSize: '0.75rem'}}>Approve</button>
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
