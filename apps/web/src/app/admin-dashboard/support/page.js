'use client';
import React, { useState, useEffect } from 'react';
import { Headset, CheckCircle, Clock, Search, Settings, Filter, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function SupportDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState('all');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState('Thank you for reaching out. A support agent will review your ticket shortly.');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      // In a real app we would fetch the auto-reply config via a separate endpoint
      // Mocking auto-reply state load for UI demo
      
      const res = await fetch(API_BASE + '/admin/support/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveAutoReply = async () => {
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/support/auto-reply', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: autoReplyEnabled, message: autoReplyMessage })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateTicketStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/support/tickets/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update ticket');
    }
  };

  const filteredTickets = tickets.filter(t => filterDomain === 'all' || t.domain === filterDomain);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Headset className="text-rose-500" /> Support & Helpdesk
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage incoming support tickets and global auto-reply rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Kanban Board */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input type="text" placeholder="Search tickets..." className="w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-sm bg-transparent" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}/>
            </div>
            <div className="relative w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <select 
                value={filterDomain} 
                onChange={e => setFilterDomain(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-sm appearance-none bg-transparent" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                <option value="all">All Domains</option>
                <option value="ecommerce">Local Shops</option>
                <option value="mobility">Riders</option>
                <option value="general">General App</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Loading tickets...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* OPEN */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h2 className="font-bold mb-4 flex items-center justify-between text-rose-500">
                  OPEN <span className="bg-rose-500/20 px-2 py-0.5 rounded text-xs">{filteredTickets.filter(t => t.status === 'open').length}</span>
                </h2>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'open').map(t => (
                    <div key={t.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">{t.domain}</span>
                      <h4 className="text-sm font-bold truncate text-slate-900 dark:text-white">{t.subject}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                      <button onClick={() => updateTicketStatus(t.id, 'in_progress')} className="w-full mt-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600/20 text-blue-500 hover:bg-blue-600/30">Start Work</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* IN PROGRESS */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h2 className="font-bold mb-4 flex items-center justify-between text-blue-500">
                  IN PROGRESS <span className="bg-blue-500/20 px-2 py-0.5 rounded text-xs">{filteredTickets.filter(t => t.status === 'in_progress').length}</span>
                </h2>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'in_progress').map(t => (
                    <div key={t.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">{t.domain}</span>
                      <h4 className="text-sm font-bold truncate text-slate-900 dark:text-white">{t.subject}</h4>
                      <button onClick={() => updateTicketStatus(t.id, 'resolved')} className="w-full mt-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30">Mark Resolved</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* RESOLVED */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-4 shadow-xl opacity-75" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h2 className="font-bold mb-4 flex items-center justify-between text-emerald-500">
                  RESOLVED <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-xs">{filteredTickets.filter(t => t.status === 'resolved').length}</span>
                </h2>
                <div className="space-y-3">
                  {filteredTickets.filter(t => t.status === 'resolved').map(t => (
                    <div key={t.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">{t.domain}</span>
                      <h4 className="text-sm font-bold truncate line-through text-slate-500 dark:text-slate-400">{t.subject}</h4>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Settings className="w-5 h-5 text-indigo-500" /> Auto-Reply
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enable Bot</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Instantly reply to new tickets.</p>
                </div>
                <button 
                  onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${autoReplyEnabled ? 'bg-indigo-500 justify-end' : 'bg-slate-700 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block text-slate-500 dark:text-slate-400">Bot Message</label>
                <textarea 
                  rows={4}
                  value={autoReplyMessage}
                  onChange={e => setAutoReplyMessage(e.target.value)}
                  disabled={!autoReplyEnabled}
                  className="w-full p-3 rounded-xl border outline-none text-sm resize-none bg-transparent disabled:opacity-50"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={saveAutoReply}
                disabled={savingSettings}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Rule
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
