'use client';
import React, { useState, useEffect } from 'react';
import { Send, History, Megaphone, Target, Link as LinkIcon, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function MarketingDashboard() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState('all_users');
  const [deepLink, setDeepLink] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/broadcasts/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      toast.error('Failed to load broadcast history');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!title || !body) return toast.error('Title and message body are required');
    if (!confirm(`Are you sure you want to blast this push notification to ${targetAudience.toUpperCase()}?`)) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/broadcast', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, target_audience: targetAudience, deep_link: deepLink })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Broadcast sent successfully!');
        setTitle('');
        setBody('');
        setDeepLink('');
        fetchHistory();
      } else {
        toast.error(data.error || 'Failed to send broadcast');
      }
    } catch (err) {
      toast.error('Network error while broadcasting');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Megaphone className="text-pink-500" /> Marketing & Communication
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Blast targeted rich push notifications to devices globally.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Composer */}
        <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Send className="w-5 h-5 text-blue-500" /> Compose Broadcast
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Target Audience</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-500" />
                <select 
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border outline-none appearance-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <option value="all_users">All Registered Users</option>
                  <option value="only_shops">Only Shop Owners / Merchants</option>
                  <option value="only_riders">Only Delivery Fleet / Riders</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Notification Title</label>
              <input 
                type="text" 
                maxLength={50}
                placeholder="e.g. Flash Sale: 50% Off Groceries!"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border outline-none font-bold"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Message Body</label>
              <textarea 
                rows={3}
                maxLength={150}
                placeholder="Tap here to claim your discount before it expires..."
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border outline-none resize-none"
                style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Deep Link (Optional)</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="e.g. localsampark://shop/12345"
                  value={deepLink}
                  onChange={e => setDeepLink(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border outline-none font-mono text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tapping the notification will open this route directly in the app.</p>
            </div>

            <button 
              onClick={handleSend}
              disabled={sending}
              className="w-full py-4 mt-4 font-black rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
            >
              <Send className="w-5 h-5" /> {sending ? 'Transmitting to Firebase...' : 'BLAST NOTIFICATION'}
            </button>
          </div>
        </div>

        {/* Live Preview & History */}
        <div className="space-y-6">
          
          {/* Mobile Preview */}
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Phone className="w-5 h-5 text-slate-400" /> Device Preview
            </h2>
            <div className="mx-auto w-64 h-24 bg-black/40 rounded-2xl border border-slate-700/50 shadow-2xl p-3 flex gap-3 overflow-hidden backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex-shrink-0 flex items-center justify-center text-white font-black">LS</div>
              <div className="flex-1 overflow-hidden">
                <div className="text-[10px] text-slate-400 font-bold mb-0.5">LOCAL SAMPARK • NOW</div>
                <h4 className="text-white text-xs font-bold leading-tight truncate">{title || 'Notification Title'}</h4>
                <p className="text-slate-300 text-[10px] leading-tight line-clamp-2 mt-0.5">{body || 'This is how your message will appear on user devices.'}</p>
              </div>
            </div>
          </div>

          {/* Broadcast History */}
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl max-h-96 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 pb-2 z-10" style={{ color: 'var(--text-main)', backgroundColor: 'var(--bg-card)' }}>
              <History className="w-5 h-5 text-emerald-500" /> Broadcast History
            </h2>
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No broadcasts sent yet.</div>
              ) : (
                history.map(log => (
                  <div key={log.id} className="p-3 border rounded-xl" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-blue-900/50 uppercase">{log.target_audience}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{log.title}</h4>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{log.body}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>By: {log.sender_name || log.admin_id}</span>
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <Send size={12}/> Sent
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
