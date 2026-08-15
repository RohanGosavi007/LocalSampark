'use client';
import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, CheckCircle, XCircle, Clock, Search, RefreshCw, UserCheck, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function EnhancedJobsDashboard() {
  const [activeTab, setActiveTab] = useState('postings');
  const [stats, setStats] = useState({ total_jobs: 0, total_applications: 0, total_resumes: 0, total_assessments: 0 });
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/jobs/overview-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setJobs(data.data || []);
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/jobs/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'postings') fetchJobs();
    if (activeTab === 'applications') fetchApplications();
  }, [activeTab]);

  const handlePostJob = async () => {
    if (!title || !description) return toast.error('Title and description required');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/jobs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, salary })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setTitle('');
        setDescription('');
        setSalary('');
        fetchJobs();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to post job');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/jobs/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchJobs();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Briefcase className="text-orange-500" /> Jobs, Skills & Recruiter HQ
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage enterprise job postings, track applicant pipelines, and skill quiz completions.</p>
        </div>
        <button onClick={() => { fetchStats(); if (activeTab==='postings') fetchJobs(); else fetchApplications(); }} className="px-4 py-2 rounded-xl flex items-center gap-2 border font-medium text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Total Job Openings</span>
          <p className="text-2xl font-black text-orange-400">{stats.total_jobs}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Total Candidate Apps</span>
          <p className="text-2xl font-black text-cyan-400">{stats.total_applications}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Parsed Resume Profiles</span>
          <p className="text-2xl font-black text-emerald-400">{stats.total_resumes}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Quiz Skill Assessments</span>
          <p className="text-2xl font-black text-purple-400">{stats.total_assessments}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setActiveTab('postings')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'postings' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          📋 Active Postings ({jobs.length})
        </button>
        <button onClick={() => setActiveTab('applications')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'applications' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          👥 Candidate Applications ({applications.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading Job & Recruiter Data...</div>
      ) : activeTab === 'postings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Post Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                Publish Free Listing
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Job Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Electrician / Store Mgr" className="w-full px-4 py-3 rounded-xl border outline-none text-sm" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Salary Range</label>
                  <input type="text" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. ₹20,000 / month" className="w-full px-4 py-3 rounded-xl border outline-none text-sm" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
                  <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Requirements..." className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none" style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                </div>
                <button onClick={handlePostJob} disabled={submitting} className="w-full py-3.5 font-bold rounded-xl text-white shadow-lg transition flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                  {submitting ? 'Publishing...' : 'Publish Job Listing'}
                </button>
              </div>
            </div>
          </div>

          {/* Job Listings */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map(job => (
                  <div key={job.id} className="p-4 border rounded-2xl flex flex-col justify-between" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white truncate max-w-[150px]">{job.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${job.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm font-black text-orange-400 mb-2">{job.salary || 'Salary Not Specified'}</p>
                      <p className="text-xs text-slate-400 line-clamp-2">{job.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-[10px] text-slate-500">{new Date(job.created_at).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        {job.status !== 'active' ? (
                          <button onClick={() => updateStatus(job.id, 'active')} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold hover:bg-emerald-600/30">Approve</button>
                        ) : (
                          <button onClick={() => updateStatus(job.id, 'rejected')} className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded text-xs font-bold hover:bg-red-600/30">Reject</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-3xl p-6 shadow-xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold text-white mb-4">Live Candidate Pipeline & Applications</h2>
          {applications.length === 0 ? (
            <p className="text-slate-500 text-sm">No applications submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b text-xs uppercase font-bold text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
                  <tr>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Applied Job</th>
                    <th className="py-3 px-4">Match Score</th>
                    <th className="py-3 px-4">Pipeline Stage</th>
                    <th className="py-3 px-4">Submitted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">
                        {app.applicant_name || 'Applicant'}
                        <span className="text-[10px] block text-slate-500">{app.applicant_phone}</span>
                      </td>
                      <td className="py-3 px-4 text-orange-400 font-bold">{app.job_title || 'General Application'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {app.match_score ? `${app.match_score}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {app.stage || 'applied'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
