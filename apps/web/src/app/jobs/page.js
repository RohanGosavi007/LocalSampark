'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, Clock, Search, ChevronRight, Building2, IndianRupee, Users, Star, Send, X, CheckCircle2, Filter, Bookmark, BookmarkCheck, Mic, MicOff, FileText, Award, TrendingUp, BarChart3, MessageCircle, Calendar, ChevronDown, Plus, Sparkles, Shield, Eye } from 'lucide-react';
import { API_URL } from '@/lib/api';

const JOB_TYPES = [
  { value: '', label: 'All Types', icon: '💼' },
  { value: 'full_time', label: 'Full-Time', icon: '🏢' },
  { value: 'part_time', label: 'Part-Time', icon: '⏰' },
  { value: 'gig', label: 'Gig Work', icon: '⚡' },
  { value: 'internship', label: 'Internship', icon: '🎓' },
  { value: 'contract', label: 'Contract', icon: '📝' },
];

const SECTORS = [
  { value: '', label: 'All Sectors' },
  { value: 'private', label: '🏢 Private' },
  { value: 'govt', label: '🏛️ Government' },
  { value: 'startup', label: '🚀 Startup' },
];

const STAGE_COLORS = {
  applied: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Applied' },
  shortlisted: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Shortlisted' },
  interviewing: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Interviewing' },
  offered: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Offered' },
  hired: { bg: 'bg-green-500/20', text: 'text-green-400', label: '🎉 Hired' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobType, setJobType] = useState('');
  const [sector, setSector] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyNote, setApplyNote] = useState('');
  const [applied, setApplied] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [resumeForm, setResumeForm] = useState({ headline: '', summary: '', experience_years: 0, education: '' });
  const [recommendations, setRecommendations] = useState([]);
  const [salaryInsights, setSalaryInsights] = useState([]);
  const [salarySearch, setSalarySearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);
  const [postJobForm, setPostJobForm] = useState({ title: '', category: '', salary_range: '', job_type: 'full_time', description: '', requirements: '', sector: 'private', remote_allowed: false, skills_required: [], urgency: 'normal' });
  const [postJobSkill, setPostJobSkill] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/jobs/postings?limit=30`;
      if (jobType) url += `&job_type=${jobType}`;
      if (sector) url += `&sector=${sector}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (remoteOnly) url += `&remote=true`;
      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs || data.data || []);
    } catch (e) { setJobs([]); }
    setLoading(false);
  }, [jobType, sector, searchTerm, remoteOnly]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    if (activeTab === 'applications' && token) {
      fetch(`${API_URL}/api/v1/jobs/applications`, { headers: authHeaders }).then(r => r.json()).then(d => setApplications(d.applications || [])).catch(() => {});
    }
    if (activeTab === 'saved' && token) {
      fetch(`${API_URL}/api/v1/jobs/saved`, { headers: authHeaders }).then(r => r.json()).then(d => {
        setSavedJobs(d.saved || []);
        setSavedIds(new Set((d.saved || []).map(s => s.id)));
      }).catch(() => {});
    }
    if (activeTab === 'resume' && token) {
      fetch(`${API_URL}/api/v1/jobs/resumes/me`, { headers: authHeaders }).then(r => r.json()).then(d => {
        if (d.resume) { setResume(d.resume); setResumeForm({ headline: d.resume.headline || '', summary: d.resume.summary || '', experience_years: d.resume.experience_years || 0, education: d.resume.education || '' }); }
        setSkills(d.skills || []);
      }).catch(() => {});
      fetch(`${API_URL}/api/v1/jobs/recommendations`, { headers: authHeaders }).then(r => r.json()).then(d => setRecommendations(d.recommendations || [])).catch(() => {});
    }
    if (activeTab === 'salary') {
      fetch(`${API_URL}/api/v1/jobs/salary-insights`).then(r => r.json()).then(d => setSalaryInsights(d.insights || [])).catch(() => {});
      fetch(`${API_URL}/api/v1/jobs/companies`).then(r => r.json()).then(d => setCompanies(d.companies || [])).catch(() => {});
    }
  }, [activeTab]);

  const toggleSave = async (jobId) => {
    if (!token) { alert('Please login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/postings/${jobId}/save`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      setSavedIds(prev => { const n = new Set(prev); data.saved ? n.add(jobId) : n.delete(jobId); return n; });
    } catch (e) {}
  };

  const handleApply = async (jobId) => {
    if (!token) { alert('Please login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/apply`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ jobId, cover_note: applyNote, resume_id: resume?.id })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setApplied(true);
        setMatchScore(data.matchScore || null);
        setTimeout(() => { setShowApplyModal(false); setApplied(false); setApplyNote(''); setMatchScore(null); }, 3000);
      }
    } catch (e) { alert('Failed to apply'); }
  };

  const addSkill = async () => {
    if (!newSkill.trim() || !token) return;
    try {
      await fetch(`${API_URL}/api/v1/jobs/resumes`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ ...resumeForm, skills: [...skills.map(s => s.skill_name), newSkill.trim()] })
      });
      setSkills(prev => [...prev, { skill_name: newSkill.trim(), proficiency: 'intermediate' }]);
      setNewSkill('');
    } catch (e) {}
  };

  const saveResume = async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/v1/jobs/resumes`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ ...resumeForm, skills: skills.map(s => ({ name: s.skill_name, proficiency: s.proficiency })) })
      });
      alert('Resume saved!');
    } catch (e) { alert('Failed'); }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // In production: upload blob to /api/v1/upload and get URL
        alert('🎤 Voice intro recorded! (Upload integration coming soon)');
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) { alert('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!token) { alert('Login first'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/postings`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(postJobForm)
      });
      const data = await res.json();
      if (data.success) { alert('Job posted!'); setShowPostJob(false); setActiveTab('browse'); fetchJobs(); }
    } catch (e) { alert('Failed'); }
  };

  const JobCard = ({ job, i, showMatch = false }) => {
    const typeColors = { full_time: 'bg-emerald-500/20 text-emerald-400', part_time: 'bg-blue-500/20 text-blue-400', gig: 'bg-amber-500/20 text-amber-400', internship: 'bg-purple-500/20 text-purple-400', contract: 'bg-cyan-500/20 text-cyan-400' };
    const isSaved = savedIds.has(job.id);

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
        onClick={() => setSelectedJob(job)}
        className="bg-card-bg/70 backdrop-blur-sm border border-border/60 rounded-2xl p-5 cursor-pointer hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-lg flex-shrink-0">
              {job.company_logo ? <img src={job.company_logo} alt="" className="w-full h-full rounded-xl object-cover" /> : <Building2 className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-text group-hover:text-blue-400 transition-colors leading-snug">{job.title}</h3>
              <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                {job.company_name || job.shop_name || 'Local Business'}
                {job.company_rating > 0 && <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" />{parseFloat(job.company_rating).toFixed(1)}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${typeColors[job.job_type] || typeColors.full_time}`}>
              {(job.job_type || 'full_time').replace('_', '-')}
            </span>
            <button onClick={(e) => { e.stopPropagation(); toggleSave(job.id); }} className="p-1 rounded-lg hover:bg-background-alt transition">
              {isSaved ? <BookmarkCheck className="w-4 h-4 text-blue-400 fill-blue-400" /> : <Bookmark className="w-4 h-4 text-text-muted" />}
            </button>
          </div>
        </div>

        <p className="text-text-muted text-sm line-clamp-2 mb-3">{job.description}</p>

        {/* Skills tags */}
        {job.skills_required && job.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(typeof job.skills_required === 'string' ? (() => { try { return JSON.parse(job.skills_required); } catch { return []; } })() : job.skills_required).slice(0, 4).map((s, idx) => (
              <span key={idx} className="text-[10px] bg-background-alt text-text-muted px-2 py-0.5 rounded-full border border-border">{typeof s === 'object' ? s.name || s : s}</span>
            ))}
            {(typeof job.skills_required === 'string' ? (() => { try { return JSON.parse(job.skills_required); } catch { return []; } })() : job.skills_required).length > 4 && (
              <span className="text-[10px] text-text-muted">+{(typeof job.skills_required === 'string' ? (() => { try { return JSON.parse(job.skills_required); } catch { return []; } })() : job.skills_required).length - 4} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {job.salary_range && <span className="flex items-center gap-0.5 text-emerald-400 font-bold"><IndianRupee className="w-3 h-3" />{job.salary_range}</span>}
            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{job.created_at ? timeAgo(job.created_at) : 'Recently'}</span>
            {job.remote_allowed ? <span className="text-cyan-400 font-bold">🏠 Remote</span> : null}
          </div>
          <div className="flex items-center gap-2">
            {showMatch && job.match_score !== undefined && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${job.match_score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : job.match_score >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                {job.match_score}% match
              </span>
            )}
            {job.applications_count > 0 && <span className="text-xs text-text-muted flex items-center gap-0.5"><Users className="w-3 h-3" />{job.applications_count}</span>}
          </div>
        </div>

        {job.urgency === 'urgent' && <span className="mt-2 inline-block text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold animate-pulse">🔥 Urgent Hiring</span>}
      </motion.div>
    );
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-12 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/15 to-purple-600/10" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-3">
              Find <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Local Jobs</span>
            </motion.h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-6">Discover opportunities near you — full-time, part-time, gig work & more</p>
            <div className="flex items-center gap-4 justify-center text-sm text-text-muted">
              <span className="flex items-center gap-1"><Sparkles className="w-4 h-4 text-amber-400" /> AI skill matching</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-500" /> Verified employers</span>
              <span className="flex items-center gap-1"><Mic className="w-4 h-4 text-purple-400" /> Voice resume</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 mt-4 mb-6">
          <div className="flex flex-wrap gap-1.5 bg-card-bg rounded-2xl p-1.5 border border-border justify-center">
            {[
              { id: 'browse', label: '🔍 Jobs' },
              { id: 'applications', label: '📋 Applications' },
              { id: 'saved', label: '🔖 Saved' },
              { id: 'resume', label: '📄 Resume' },
              { id: 'salary', label: '💰 Insights' },
              { id: 'post', label: '📝 Post Job' },
              { id: 'quizzes', label: '📝 Skill Quizzes', isLink: '/advanced' },
              { id: 'gap', label: '📈 Gap Analyzer', isLink: '/advanced' }
            ].map(tab => (
              tab.isLink ? (
                <a key={tab.id} href={tab.isLink}
                  className="py-2.5 px-3 rounded-xl text-sm font-bold text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all flex items-center gap-1">
                  {tab.label}
                </a>
              ) : (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap px-3 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-text-muted hover:text-text'}`}>
                  {tab.label}
                </button>
              )
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* ═══ BROWSE TAB ═══ */}
          {activeTab === 'browse' && (
            <>
              {/* Search + Filters */}
              <div className="bg-card-bg/70 backdrop-blur-sm border border-border rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-background-alt rounded-xl px-3 py-2.5 border border-border">
                    <Search className="text-text-muted w-4 h-4 flex-shrink-0" />
                    <input type="text" placeholder="Search by title, skill, company..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-text w-full outline-none text-sm placeholder:text-text-muted" />
                  </div>
                  <select value={jobType} onChange={e => setJobType(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                  <select value={sector} onChange={e => setSector(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-text text-sm bg-background-alt rounded-xl px-3 py-2.5 border border-border cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} className="accent-blue-500" />
                    🏠 Remote
                  </label>
                </div>
              </div>

              {/* Job Type Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {JOB_TYPES.map(t => (
                  <button key={t.value} onClick={() => setJobType(t.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${jobType === t.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-card-bg text-text-muted border border-border hover:text-text'}`}>
                    <span className="mr-1">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>

              {/* Results */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="bg-card-bg/60 rounded-2xl p-6 animate-pulse"><div className="h-5 bg-slate-700 rounded w-3/4 mb-4" /><div className="h-4 bg-slate-700 rounded w-1/2 mb-3" /><div className="h-4 bg-slate-700 rounded w-1/3" /></div>)}
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-16">
                  <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl text-text font-semibold mb-2">No Jobs Found</h3>
                  <p className="text-text-muted">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((job, i) => <JobCard key={job.id || i} job={job} i={i} />)}
                </div>
              )}
            </>
          )}

          {/* ═══ APPLICATIONS TAB ═══ */}
          {activeTab === 'applications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!token ? (
                <div className="text-center py-16"><p className="text-text-muted">Login to track applications</p></div>
              ) : applications.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl text-text font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-text-muted">Browse jobs and start applying!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pipeline Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    {Object.entries(STAGE_COLORS).map(([stage, config]) => {
                      const count = applications.filter(a => (a.stage || 'applied') === stage).length;
                      return (
                        <div key={stage} className={`${config.bg} rounded-xl p-3 text-center`}>
                          <p className={`text-2xl font-black ${config.text}`}>{count}</p>
                          <p className={`text-xs font-bold ${config.text}`}>{config.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {applications.map((app, i) => {
                    const stageConfig = STAGE_COLORS[app.stage || 'applied'] || STAGE_COLORS.applied;
                    return (
                      <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-card-bg border border-border rounded-2xl p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-base font-bold text-text">{app.job_title}</h3>
                            <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> {app.company_name || 'Company'}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${stageConfig.bg} ${stageConfig.text}`}>{stageConfig.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          {app.match_score > 0 && (
                            <span className={`font-bold ${app.match_score >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {app.match_score}% match
                            </span>
                          )}
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> Applied {app.applied_at ? timeAgo(app.applied_at) : 'recently'}</span>
                          {app.interview_date && <span className="flex items-center gap-0.5 text-purple-400"><Calendar className="w-3 h-3" /> Interview: {new Date(app.interview_date).toLocaleDateString()}</span>}
                        </div>
                        {/* Stage Timeline */}
                        <div className="flex items-center gap-1 mt-4">
                          {['applied','shortlisted','interviewing','offered','hired'].map((stage, idx) => {
                            const stageOrder = ['applied','shortlisted','interviewing','offered','hired'];
                            const currentIdx = stageOrder.indexOf(app.stage || 'applied');
                            const isActive = idx <= currentIdx;
                            const isRejected = app.stage === 'rejected';
                            return (
                              <React.Fragment key={stage}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isRejected && idx === currentIdx ? 'bg-red-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-border text-text-muted'}`}>
                                  {isActive ? '✓' : idx + 1}
                                </div>
                                {idx < 4 && <div className={`flex-1 h-0.5 ${isActive && idx < currentIdx ? 'bg-blue-500' : 'bg-border'}`} />}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ SAVED TAB ═══ */}
          {activeTab === 'saved' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!token ? (
                <div className="text-center py-16"><p className="text-text-muted">Login to see saved jobs</p></div>
              ) : savedJobs.length === 0 ? (
                <div className="text-center py-16"><Bookmark className="w-16 h-16 text-slate-600 mx-auto mb-4" /><h3 className="text-xl text-text font-semibold">No saved jobs</h3></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedJobs.map((job, i) => <JobCard key={job.id} job={job} i={i} />)}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ RESUME TAB ═══ */}
          {activeTab === 'resume' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
              {!token ? (
                <div className="text-center py-16"><p className="text-text-muted">Login to manage your resume</p></div>
              ) : (
                <>
                  {/* Resume Health */}
                  <div className="bg-card-bg border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-text flex items-center gap-2"><Award className="w-5 h-5 text-amber-400" /> Resume Health</h3>
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-border" strokeWidth="4" />
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                            className={`${(resume?.health_score || 0) >= 70 ? 'text-emerald-500' : (resume?.health_score || 0) >= 40 ? 'text-amber-500' : 'text-red-500'}`}
                            strokeWidth="4" strokeDasharray={`${(resume?.health_score || 0) * 1.76} 176`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-text">{resume?.health_score || 0}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[{ label: 'Headline', done: !!resumeForm.headline }, { label: 'Summary', done: !!resumeForm.summary }, { label: 'Experience', done: resumeForm.experience_years > 0 }, { label: 'Education', done: !!resumeForm.education }, { label: 'Skills', done: skills.length > 0 }, { label: 'Voice Intro', done: !!resume?.voice_intro_url }].map(item => (
                        <div key={item.label} className={`flex items-center gap-1.5 ${item.done ? 'text-emerald-400' : 'text-text-muted'}`}>
                          {item.done ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-text-muted" />}
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="bg-card-bg border border-border rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-text">📝 Profile</h3>
                    <input type="text" placeholder="Professional Headline (e.g. Full-Stack Developer)" value={resumeForm.headline} onChange={e => setResumeForm({...resumeForm, headline: e.target.value})}
                      className="w-full bg-background-alt text-text rounded-xl p-3 border border-border outline-none focus:border-blue-500 text-sm" />
                    <textarea placeholder="Professional Summary..." rows={3} value={resumeForm.summary} onChange={e => setResumeForm({...resumeForm, summary: e.target.value})}
                      className="w-full bg-background-alt text-text rounded-xl p-3 border border-border outline-none focus:border-blue-500 text-sm resize-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">Experience (years)</label>
                        <input type="number" min={0} value={resumeForm.experience_years} onChange={e => setResumeForm({...resumeForm, experience_years: +e.target.value})}
                          className="w-full bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">Education</label>
                        <input type="text" placeholder="e.g. B.Tech Computer Science" value={resumeForm.education} onChange={e => setResumeForm({...resumeForm, education: e.target.value})}
                          className="w-full bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm" />
                      </div>
                    </div>
                    <button onClick={saveResume} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition">Save Profile</button>
                  </div>

                  {/* Skills */}
                  <div className="bg-card-bg border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-text mb-4">🎯 Skills</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {skills.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-500/15 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-1">
                          {s.skill_name}
                          <span className="text-[10px] opacity-60">({s.proficiency})</span>
                        </span>
                      ))}
                      {skills.length === 0 && <p className="text-text-muted text-sm">No skills added yet</p>}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Add a skill (e.g. React, Python, Excel)" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSkill()}
                        className="flex-1 bg-background-alt text-text rounded-xl px-4 py-2.5 border border-border outline-none text-sm" />
                      <button onClick={addSkill} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Voice Intro */}
                  <div className="bg-card-bg border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-text mb-2">🎤 Voice Introduction</h3>
                    <p className="text-text-muted text-sm mb-4">Record a 30-second voice intro to stand out to recruiters (Apna-style)</p>
                    <button onClick={isRecording ? stopRecording : startRecording}
                      className={`w-full py-4 font-bold rounded-xl transition text-lg flex items-center justify-center gap-2 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>
                      {isRecording ? <><MicOff className="w-5 h-5" /> Stop Recording</> : <><Mic className="w-5 h-5" /> Start Recording</>}
                    </button>
                  </div>

                  {/* AI Recommendations */}
                  {recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> AI Recommended Jobs</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {recommendations.slice(0, 5).map((job, i) => <JobCard key={job.id} job={job} i={i} showMatch={true} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ═══ SALARY INSIGHTS TAB ═══ */}
          {activeTab === 'salary' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-400" /> Salary Insights</h3>
              <div className="flex gap-3 mb-6">
                <input type="text" placeholder="Search by job title..." value={salarySearch} onChange={e => setSalarySearch(e.target.value)}
                  className="flex-1 bg-card-bg text-text rounded-xl px-4 py-3 border border-border outline-none text-sm" />
                <button onClick={() => fetch(`${API_URL}/api/v1/jobs/salary-insights?job_title=${salarySearch}`).then(r => r.json()).then(d => setSalaryInsights(d.insights || []))}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm">Search</button>
              </div>

              {salaryInsights.length === 0 ? (
                <div className="text-center py-12 bg-card-bg border border-border rounded-2xl">
                  <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
                  <p className="text-text-muted">No salary data available yet. Be the first to contribute!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salaryInsights.map((insight, i) => (
                    <div key={i} className="bg-card-bg border border-border rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-text font-bold">{insight.job_title}</h4>
                          {insight.company_name && <p className="text-text-muted text-xs">{insight.company_name}</p>}
                        </div>
                        <span className="text-xs text-text-muted">{insight.data_points} report{insight.data_points > 1 ? 's' : ''}</span>
                      </div>
                      <div className="bg-background-alt rounded-xl p-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-text-muted">₹{((insight.min_salary || 0) / 1000).toFixed(0)}K</span>
                          <span className="text-emerald-400 font-bold">₹{((insight.avg_salary || 0) / 1000).toFixed(0)}K avg</span>
                          <span className="text-text-muted">₹{((insight.max_salary || 0) / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((insight.avg_salary || 0) / (insight.max_salary || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Companies */}
              {companies.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-text mb-4">🏢 Company Profiles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companies.map(c => (
                      <div key={c.id} onClick={() => { setSelectedCompany(c); setShowCompanyModal(true); }}
                        className="bg-card-bg border border-border rounded-2xl p-5 cursor-pointer hover:border-blue-500/40 transition">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            {c.logo_url ? <img src={c.logo_url} className="w-full h-full rounded-xl object-cover" /> : <Building2 className="w-5 h-5 text-blue-400" />}
                          </div>
                          <div>
                            <h4 className="text-text font-bold text-sm">{c.name}</h4>
                            <p className="text-text-muted text-xs">{c.industry} · {c.employee_count} employees</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          {c.average_rating > 0 && <span className="flex items-center gap-0.5 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" /> {parseFloat(c.average_rating).toFixed(1)}</span>}
                          {c.review_count > 0 && <span>{c.review_count} reviews</span>}
                          {c.is_verified ? <span className="text-emerald-400 flex items-center gap-0.5"><Shield className="w-3 h-3" /> Verified</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ POST JOB TAB ═══ */}
          {activeTab === 'post' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
              <form onSubmit={handlePostJob} className="bg-card-bg border border-border rounded-3xl p-8 space-y-5">
                <h2 className="text-2xl font-bold text-text text-center">Post a Job</h2>
                <input type="text" required placeholder="Job Title *" value={postJobForm.title} onChange={e => setPostJobForm({...postJobForm, title: e.target.value})}
                  className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-blue-500 text-sm" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required placeholder="Category *" value={postJobForm.category} onChange={e => setPostJobForm({...postJobForm, category: e.target.value})}
                    className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm" />
                  <input type="text" placeholder="Salary Range (e.g. 15K-25K)" value={postJobForm.salary_range} onChange={e => setPostJobForm({...postJobForm, salary_range: e.target.value})}
                    className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <select value={postJobForm.job_type} onChange={e => setPostJobForm({...postJobForm, job_type: e.target.value})} className="bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                    {JOB_TYPES.filter(t => t.value).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={postJobForm.sector} onChange={e => setPostJobForm({...postJobForm, sector: e.target.value})} className="bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                    {SECTORS.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <select value={postJobForm.urgency} onChange={e => setPostJobForm({...postJobForm, urgency: e.target.value})} className="bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                    <option value="normal">Normal</option>
                    <option value="urgent">🔥 Urgent</option>
                  </select>
                </div>
                <textarea rows={4} required placeholder="Job Description *" value={postJobForm.description} onChange={e => setPostJobForm({...postJobForm, description: e.target.value})}
                  className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-blue-500 text-sm resize-none" />
                <textarea rows={2} placeholder="Requirements" value={postJobForm.requirements} onChange={e => setPostJobForm({...postJobForm, requirements: e.target.value})}
                  className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm resize-none" />

                {/* Skills */}
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Required Skills</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {postJobForm.skills_required.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs font-bold flex items-center gap-1">
                        {s} <button type="button" onClick={() => setPostJobForm({...postJobForm, skills_required: postJobForm.skills_required.filter((_,j) => j !== i)})} className="hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Add skill" value={postJobSkill} onChange={e => setPostJobSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (postJobSkill) { setPostJobForm({...postJobForm, skills_required: [...postJobForm.skills_required, postJobSkill]}); setPostJobSkill(''); } } }}
                      className="flex-1 bg-background-alt text-text rounded-xl px-3 py-2 border border-border outline-none text-sm" />
                    <button type="button" onClick={() => { if (postJobSkill) { setPostJobForm({...postJobForm, skills_required: [...postJobForm.skills_required, postJobSkill]}); setPostJobSkill(''); } }}
                      className="px-3 py-2 bg-border text-text rounded-xl text-sm"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-text text-sm"><input type="checkbox" checked={postJobForm.remote_allowed} onChange={e => setPostJobForm({...postJobForm, remote_allowed: e.target.checked})} className="accent-blue-500" /> 🏠 Remote work allowed</label>
                <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition text-lg">Publish Job 🚀</button>
              </form>
            </motion.div>
          )}
        </div>

        {/* ═══ JOB DETAIL MODAL ═══ */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedJob(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card-bg border border-border rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-8"
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text">{selectedJob.title}</h2>
                      <p className="text-text-muted text-sm mt-0.5">{selectedJob.company_name || selectedJob.shop_name || 'Local Business'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedJob(null)} className="p-2 rounded-xl hover:bg-background-alt"><X className="w-5 h-5 text-text-muted" /></button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">{(selectedJob.job_type || 'full_time').replace('_', '-')}</span>
                  {selectedJob.salary_range && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">₹{selectedJob.salary_range}</span>}
                  {selectedJob.sector && <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold">{selectedJob.sector}</span>}
                  {selectedJob.remote_allowed ? <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold">🏠 Remote</span> : null}
                  {selectedJob.urgency === 'urgent' && <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold animate-pulse">🔥 Urgent</span>}
                </div>

                {/* Skills */}
                {selectedJob.skills_required && (() => { try { const s = typeof selectedJob.skills_required === 'string' ? JSON.parse(selectedJob.skills_required) : selectedJob.skills_required; return s.length > 0; } catch { return false; } })() && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-text-muted mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {(typeof selectedJob.skills_required === 'string' ? (() => { try { return JSON.parse(selectedJob.skills_required); } catch { return []; } })() : selectedJob.skills_required).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-background-alt text-text rounded-lg text-xs border border-border">{typeof s === 'object' ? s.name || s : s}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="prose prose-invert prose-sm max-w-none mb-6">
                  <p className="text-text-muted whitespace-pre-line">{selectedJob.description}</p>
                  {selectedJob.requirements && <><h4 className="text-text text-sm font-bold mt-4 mb-1">Requirements</h4><p className="text-text-muted whitespace-pre-line">{selectedJob.requirements}</p></>}
                  {selectedJob.benefits && <><h4 className="text-text text-sm font-bold mt-4 mb-1">Benefits</h4><p className="text-text-muted whitespace-pre-line">{selectedJob.benefits}</p></>}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowApplyModal(true)}
                    className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Quick Apply
                  </button>
                  <button onClick={() => toggleSave(selectedJob.id)} className="py-3.5 px-5 bg-background-alt border border-border rounded-2xl hover:bg-border/40 transition">
                    {savedIds.has(selectedJob.id) ? <BookmarkCheck className="w-5 h-5 text-blue-400 fill-blue-400" /> : <Bookmark className="w-5 h-5 text-text-muted" />}
                  </button>
                </div>

                {selectedJob.applications_count > 0 && <p className="text-center text-xs text-text-muted mt-3">{selectedJob.applications_count} people have applied</p>}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ APPLY MODAL ═══ */}
        <AnimatePresence>
          {showApplyModal && selectedJob && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setShowApplyModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-card-bg border border-border rounded-3xl max-w-md w-full p-8"
                onClick={e => e.stopPropagation()}>
                {applied ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-text">Application Sent! 🎉</h3>
                    {matchScore !== null && (
                      <div className="mt-4">
                        <p className="text-text-muted text-sm mb-2">Your skill match score:</p>
                        <span className={`text-3xl font-black ${matchScore >= 70 ? 'text-emerald-400' : matchScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{matchScore}%</span>
                      </div>
                    )}
                    <p className="text-text-muted mt-3 text-sm">Track your application in the Applications tab</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-text mb-1">Apply to {selectedJob.title}</h3>
                    <p className="text-text-muted text-sm mb-4">{selectedJob.company_name || 'Company'}</p>
                    {resume && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 text-sm text-emerald-400 flex items-center gap-2"><FileText className="w-4 h-4" /> Resume attached automatically</div>}
                    {skills.length > 0 && <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 text-sm text-blue-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI will calculate your skill match score</div>}
                    <textarea value={applyNote} onChange={e => setApplyNote(e.target.value)}
                      placeholder="Add a cover note (optional)..."
                      className="w-full bg-background-alt text-text rounded-xl p-4 border border-border focus:border-blue-500 outline-none resize-none h-28 mb-4 text-sm" />
                    <button onClick={() => handleApply(selectedJob.id)}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg transition">
                      Submit Application 🚀
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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
