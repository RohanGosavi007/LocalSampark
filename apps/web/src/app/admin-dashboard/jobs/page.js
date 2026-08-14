'use client';
import React, { useState, useEffect } from 'react';
import { Wrench, Briefcase, Plus, CheckCircle, XCircle, Clock, Save, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function JobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/jobs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handlePostJob = async () => {
    if (!title || !description) return toast.error('Title and description required');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/jobs', {
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Wrench className="text-orange-500" /> Jobs & Services
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage local job postings. Listings are free for shops and auto-expire after 60 days.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Job Posting Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Post Free Listing
            </h2>
            <p className="text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded mb-4 font-bold border border-emerald-500/20">
              Posting is 100% Free for Local Shops!
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Job Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Senior Tailor Needed"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Salary / Wages</label>
                <input 
                  type="text" 
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  placeholder="e.g. ₹15,000 / month"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
                <textarea 
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Requirements and details..."
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handlePostJob}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                <Briefcase className="w-4 h-4" /> {submitting ? 'Posting...' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Job Listings Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Briefcase className="w-5 h-5 text-orange-500" /> Job Board Overview
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading listings...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No active job listings.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map(job => (
                  <div key={job.id} className="p-4 border rounded-2xl flex flex-col justify-between" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white truncate max-w-[150px]">{job.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          job.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' :
                          job.status === 'expired' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {job.status === 'active' && <CheckCircle className="w-3 h-3" />}
                          {job.status === 'expired' && <Clock className="w-3 h-3" />}
                          {job.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">{job.shop_name || 'Direct Employer'}</p>
                      <p className="text-sm font-black text-orange-400 mb-2">{job.salary || 'Salary Not Specified'}</p>
                      <p className="text-xs text-slate-400 line-clamp-2">{job.description}</p>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50">
                      <span className="text-[10px] text-slate-500">
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {job.status !== 'active' && (
                          <button onClick={() => updateStatus(job.id, 'active')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                            Approve
                          </button>
                        )}
                        {job.status === 'active' && (
                          <button onClick={() => updateStatus(job.id, 'rejected')} className="px-3 py-1.5 bg-red-600/20 text-red-500 rounded text-xs font-bold hover:bg-red-600/30">
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
