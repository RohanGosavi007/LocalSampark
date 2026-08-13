'use client';
import React, { useState, useEffect } from 'react';
import { Landmark, AlertTriangle, ShieldAlert, CheckCircle, Clock, MapPin, Plus, Phone, Hammer, Scale } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CivicDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Civic');
  
  const [reporterName, setReporterName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Civic');
  const [issueType, setIssueType] = useState('Pothole');
  const [department, setDepartment] = useState('PWD');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/civic/issues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIssues(data.data);
      }
    } catch (err) {
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleCreateRequest = async () => {
    if (!reporterName || !phone || !issueType || !description) return toast.error('Required fields missing');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/civic/issues', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporter_name: reporterName, phone, category, issue_type: issueType, department: category === 'Civic' ? department : 'Legal', description })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setReporterName('');
        setPhone('');
        setDescription('');
        fetchIssues();
      } else {
        toast.error(data.error || 'Failed to log request');
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
      const res = await fetch(`http://localhost:5000/api/v1/admin/civic/issues/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchIssues();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleEscalation = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/civic/issues/${id}/escalate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalated: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchIssues();
      }
    } catch (err) {
      toast.error('Failed to update escalation status');
    }
  };

  const displayedIssues = issues.filter(i => i.category === activeTab);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Landmark className="text-indigo-500" /> Civic & Legal
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage local civic complaints and legal consultation requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Request Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Log Issue
            </h2>

            <div className="space-y-4">
              
              <div className="flex gap-2 p-1 bg-slate-800 rounded-xl mb-4">
                <button onClick={() => { setCategory('Civic'); setIssueType('Pothole'); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${category === 'Civic' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400'}`}>
                  Civic Complaint
                </button>
                <button onClick={() => { setCategory('Legal'); setIssueType('Property Dispute'); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${category === 'Legal' ? 'bg-purple-500 text-white shadow' : 'text-slate-400'}`}>
                  Legal Request
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Reporter Name</label>
                <input 
                  type="text" 
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className={category === 'Legal' ? 'col-span-2' : ''}>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Issue Type</label>
                  <select 
                    value={issueType}
                    onChange={e => setIssueType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    {category === 'Civic' ? (
                      <>
                        <option>Pothole</option>
                        <option>Garbage Collection</option>
                        <option>Water Supply</option>
                        <option>Street Light</option>
                      </>
                    ) : (
                      <>
                        <option>Property Dispute</option>
                        <option>Tenant Issue</option>
                        <option>Business Registration</option>
                        <option>Consultation</option>
                      </>
                    )}
                  </select>
                </div>
                {category === 'Civic' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Department</label>
                    <select 
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none"
                      style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                    >
                      <option>PWD</option>
                      <option>BMC</option>
                      <option>Water Board</option>
                      <option>Electricity</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description / Location</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={category === 'Civic' ? "e.g. Massive pothole on Main Street" : "Brief details of legal issue"}
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleCreateRequest}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: category === 'Civic' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #a855f7, #9333ea)' }}
              >
                {category === 'Civic' ? <Hammer className="w-4 h-4" /> : <Scale className="w-4 h-4"/>} 
                {submitting ? 'Submitting...' : `Log ${category} Issue`}
              </button>
            </div>
          </div>
        </div>

        {/* Live Requests Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                {activeTab === 'Civic' ? <Hammer className="w-5 h-5 text-indigo-500" /> : <Scale className="w-5 h-5 text-purple-500"/>} 
                Active {activeTab} Board
              </h2>

              <div className="flex bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setActiveTab('Civic')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'Civic' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400'}`}>Civic</button>
                <button onClick={() => setActiveTab('Legal')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'Legal' ? 'bg-purple-500 text-white shadow' : 'text-slate-400'}`}>Legal</button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading records...</div>
            ) : displayedIssues.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No pending {activeTab.toLowerCase()} requests.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedIssues.map(req => (
                  <div key={req.id} className="p-4 border rounded-2xl flex flex-col justify-between relative overflow-hidden" style={{ borderColor: req.escalated ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    {req.escalated && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg flex items-center gap-1 shadow-lg">
                        <ShieldAlert className="w-3 h-3"/> Escalated
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {req.issue_type}
                          </h4>
                          <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 mt-1 rounded border inline-block w-max ${
                            activeTab === 'Civic' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                          }`}>
                            {req.department}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          req.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-500' : 
                          req.status === 'in-progress' ? 'bg-sky-500/20 text-sky-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="bg-slate-800/50 p-3 rounded-xl mt-4 border border-slate-700/50">
                        <span className="text-xs font-bold text-slate-400 block mb-1">Reporter</span>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-200">{req.reporter_name}</span>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1"><Phone className="w-3 h-3"/> {req.phone}</span>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-400">
                        <p className="line-clamp-3">{req.description}</p>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        {activeTab === 'Civic' && (
                          <button 
                            onClick={() => toggleEscalation(req.id, req.escalated)}
                            disabled={req.status === 'resolved'}
                            className={`flex-1 text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition ${req.escalated ? 'bg-red-600/20 text-red-500 border border-red-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-red-400 disabled:opacity-50'}`}
                          >
                            <AlertTriangle className="w-3 h-3"/> {req.escalated ? 'Escalated to Govt' : 'Escalate to Govt'}
                          </button>
                        )}
                        {req.status === 'pending' && (
                          <button 
                            onClick={() => updateStatus(req.id, 'in-progress')}
                            className="flex-1 text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition bg-sky-600/20 text-sky-500 border border-sky-500/30 hover:bg-sky-600/30"
                          >
                            Mark In Progress
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50 relative z-10">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      {req.status !== 'resolved' && (
                        <button onClick={() => updateStatus(req.id, 'resolved')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                          Resolve
                        </button>
                      )}
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
