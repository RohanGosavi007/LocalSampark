'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { AlertTriangle, Radio, Send, CheckCircle } from 'lucide-react';

export default function EmergencyBroadcast() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'high'
  });

  const handleBroadcast = (e) => {
    e.preventDefault();
    // Simulate sending push notifications to all residents
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ title: '', message: '', priority: 'high' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <Header />
      
      <div className="max-w-3xl mx-auto p-6 pt-24">
        
        <div className="flex items-center gap-3 mb-8">
          <Radio className="text-red-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white">Emergency Broadcast</h1>
            <p className="text-slate-400 mt-1 font-medium">Send high-priority Push Notifications to all residents instantly.</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Danger gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
          
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
              <CheckCircle size={64} className="text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Broadcast Sent Successfully</h2>
              <p className="text-slate-400">Push notifications were dispatched to 482 residents.</p>
            </div>
          ) : (
            <form onSubmit={handleBroadcast} className="space-y-6 animate-fade-in">
              
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-6">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <p className="text-red-400 text-sm">
                  <strong>Warning:</strong> Use this system strictly for emergencies (e.g., water cuts, fire drills, security breaches). Misuse will result in residents disabling notifications.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Alert Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. URGENT: Water Supply Interruption"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 text-white font-bold outline-none focus:border-red-500 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Message Details</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Provide detailed information regarding the emergency..."
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 text-white outline-none focus:border-red-500 transition-colors" 
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Severity Level</label>
                <div className="grid grid-cols-3 gap-4">
                  {['critical', 'high', 'info'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm({...form, priority: level})}
                      className={`py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-colors ${
                        form.priority === level 
                          ? level === 'critical' ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30' :
                            level === 'high' ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/30' :
                            'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl mt-8 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <Send size={20} />
                Trigger Broadcast Notification
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
