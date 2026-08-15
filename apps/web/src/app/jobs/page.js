'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, Clock, Search, Filter, ChevronRight, Building2, IndianRupee, Users, Star, Send, X, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

const JOB_TYPES = [
  { value: '', label: 'All Types', icon: '💼' },
  { value: 'full_time', label: 'Full-Time', icon: '🏢' },
  { value: 'part_time', label: 'Part-Time', icon: '⏰' },
  { value: 'gig', label: 'Gig Work', icon: '⚡' },
  { value: 'internship', label: 'Internship', icon: '🎓' },
  { value: 'contract', label: 'Contract', icon: '📝' },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobType, setJobType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyNote, setApplyNote] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [jobType]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/jobs/postings?status=active`;
      if (jobType) url += `&type=${jobType}`;
      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs || data.data || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
      setJobs([]);
    }
    setLoading(false);
  };

  const handleApply = async (jobId) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { alert('Please login to apply'); return; }
      const res = await fetch(`${API_URL}/api/v1/jobs/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, cover_note: applyNote })
      });
      const data = await res.json();
      if (data.success || data.id || res.ok) {
        setApplied(true);
        setTimeout(() => { setShowApplyModal(false); setApplied(false); setApplyNote(''); }, 2000);
      }
    } catch (e) { console.error(e); }
  };

  const filtered = jobs.filter(j =>
    (j.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (j.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-text mb-4">
              Find <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Local Jobs</span>
            </motion.h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-8">
              Discover opportunities near you — full-time, part-time, gig work & more
            </p>
            <div className="flex items-center gap-3 max-w-xl mx-auto bg-card-bg/80 backdrop-blur-md rounded-2xl border border-border px-4 py-3">
              <Search className="text-text-muted w-5 h-5 flex-shrink-0" />
              <input type="text" placeholder="Search jobs by title, skill, or company..."
                className="bg-transparent text-text flex-1 outline-none placeholder:text-text-muted"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Job Type Filters */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {JOB_TYPES.map(t => (
              <button key={t.value} onClick={() => setJobType(t.value)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  jobType === t.value
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                     : "bg-card-bg text-text-muted hover:bg-background-alt border border-border"
                }`}>
                <span className="mr-1.5">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job Listings */}
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-card-bg/60 rounded-2xl p-6 animate-pulse">
                  <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
                  <div className="h-4 bg-slate-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl text-text-muted font-semibold">No Jobs Found</h3>
              <p className="text-text-muted mt-2">Try adjusting your search or check back later</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filtered.map((job, i) => (
                  <motion.div key={job.id || i}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedJob(job)}
                    className="bg-card-bg/70 backdrop-blur-sm border border-border/60 rounded-2xl p-6 cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-text group-hover:text-blue-400 transition-colors">{job.title}</h3>
                        <p className="text-text-muted text-sm flex items-center gap-1 mt-1">
                          <Building2 className="w-3.5 h-3.5" /> {job.shop_name || job.company || 'Local Business'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        job.job_type === 'full_time' ? 'bg-emerald-500/20 text-emerald-400' :
                        job.job_type === 'gig' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {(job.job_type || 'full_time').replace('_', '-')}
                      </span>
                    </div>
                    <p className="text-text-muted text-sm line-clamp-2 mb-4">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      {job.salary_range && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{job.salary_range}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently'}</span>
                      {job.applications_count !== undefined && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job.applications_count} applicants</span>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Job Detail Modal */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedJob(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card-bg border border-border rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-8"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-text">{selectedJob.title}</h2>
                    <p className="text-text-muted mt-1 flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> {selectedJob.shop_name || selectedJob.company || 'Local Business'}
                    </p>
                  </div>
                  <button onClick={() => setSelectedJob(null)} className="text-text-muted hover:text-text p-2 rounded-xl hover:bg-background-alt">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">{(selectedJob.job_type || 'full_time').replace('_', '-')}</span>
                  {selectedJob.salary_range && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">₹{selectedJob.salary_range}</span>}
                </div>
                <div className="prose prose-invert prose-sm max-w-none mb-8">
                  <p className="text-text-muted whitespace-pre-line">{selectedJob.description}</p>
                </div>
                <button onClick={() => setShowApplyModal(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Apply Now
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply Modal */}
        <AnimatePresence>
          {showApplyModal && selectedJob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setShowApplyModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-card-bg border border-border rounded-3xl max-w-md w-full p-8"
                onClick={(e) => e.stopPropagation()}>
                {applied ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-text">Application Sent!</h3>
                    <p className="text-text-muted mt-2">We'll notify you about updates</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-text mb-4">Apply to {selectedJob.title}</h3>
                    <textarea value={applyNote} onChange={(e) => setApplyNote(e.target.value)}
                      placeholder="Add a cover note (optional)..."
                      className="w-full bg-card-bg text-text rounded-xl p-4 border border-border focus:border-blue-500 outline-none resize-none h-32 mb-4"
                    />
                    <button onClick={() => handleApply(selectedJob.id)}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors">
                      Submit Application
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
