'use client';
import React, { useState } from 'react';
import { Send, Users, Smartphone, History, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GodModeCampaigns() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all_users');
  const [sending, setSending] = useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !body) return toast.error('Please enter a title and message');
    
    if (!confirm('Are you absolutely sure? This will send a push notification to ALL users in the selected audience.')) return;
    
    try {
      setSending(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/broadcast', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ title, body, target_audience: audience })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Broadcast deployed successfully 🚀');
        setTitle('');
        setBody('');
      } else {
        toast.error(data.error || 'Failed to send broadcast');
      }
    } catch (err) {
      toast.error('Network error during broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2 text-white">
          <Send className="text-blue-500" /> Global Broadcast Center
        </h1>
        <p className="text-slate-400">Push emergency alerts and announcements directly to all user devices instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-500"/> Compose Push Notification
          </h2>
          
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Notification Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 🚨 Emergency System Alert"
                maxLength={50}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Message Body</label>
              <textarea 
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="e.g. Food deliveries are temporarily halted due to severe weather."
                rows={4}
                maxLength={150}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none resize-none"
              ></textarea>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Target Audience</label>
              <select 
                value={audience}
                onChange={e => setAudience(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none appearance-none"
              >
                <option value="all_users">Global (All Registered Devices)</option>
                <option value="all_shops">Merchant Fleet Only</option>
                <option value="all_agents">Delivery Agents Only</option>
              </select>
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-900/50 rounded-xl flex items-start gap-3 mt-4">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-400">
                This will trigger an immediate push notification. Make sure the message is fully verified before sending.
              </p>
            </div>

            <button 
              type="submit"
              disabled={sending}
              className="w-full py-4 mt-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? 'Deploying Broadcast...' : 'DEPLOY BROADCAST 🚀'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500"/> Broadcast History
          </h2>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
             <Users className="w-16 h-16 text-slate-700 mb-4" />
             <h4 className="text-lg font-bold text-white mb-2">No Recent Broadcasts</h4>
             <p className="text-sm text-slate-500">
               Your most recent push notification deployments and their delivery success rates will appear here.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
