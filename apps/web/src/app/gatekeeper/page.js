'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { UserPlus, Package, Car, Users, CheckCircle, XCircle, Languages, WifiOff } from 'lucide-react';
import io from 'socket.io-client';
import { useLanguage } from '../components/LanguageToggle';
import { saveToSyncQueue, getSyncQueue, flushSyncQueue } from '../../utils/offlineSync';

export default function GatekeeperPortal() {
  const [activeTab, setActiveTab] = useState('guest');
  const [form, setForm] = useState({ name: '', phone: '', host_flat: '', purpose: 'Personal' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'waiting', 'approved', 'denied'
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const { t, language, setLanguage } = useLanguage();

  // Monitor network status
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      await flushSyncQueue();
      setPendingSyncs(getSyncQueue().length);
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOffline(!navigator.onLine);
    setPendingSyncs(getSyncQueue().length);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('waiting');

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const endpoint = `${BACKEND_URL}/api/v1/society-management/visitors`;
      
      if (isOffline) {
        // Network is down, save to queue and mock success
        saveToSyncQueue(endpoint, 'POST', form);
        setPendingSyncs(getSyncQueue().length);
        setStatus('approved'); // Auto approve for demo or show "Saved Offline"
        setLoading(false);
        return;
      }

      // Mock socket connection just for demo listening 
      const socket = io(BACKEND_URL);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        // Listen for real response from resident
        socket.emit('join_gatekeeper_room', { gateId: 'GATE-1' }); // optional room logic
        
        socket.on('VISITOR_RESPONSE', (response) => {
          setStatus(response.status);
          socket.disconnect();
        });

        // Fallback timeout in case resident doesn't answer in 30s
        setTimeout(() => {
          if (socket.connected) {
            setStatus('denied'); // auto deny or timeout
            socket.disconnect();
          }
        }, 30000);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', host_flat: '', purpose: 'Personal' });
    setStatus(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:bg-slate-900">
      {/* Hidden desktop header to simulate a mobile app view */}
      <div className="hidden md:block"><Header /></div>
      
      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-slate-950 md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-slate-800 md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* App Bar */}
        <div className="bg-slate-900 p-6 shadow-md border-b border-slate-800 z-10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{t('gatekeeper.title')}</h1>
              <p className="text-slate-400 text-sm">{t('gatekeeper.subtitle')}</p>
            </div>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            >
              {/* language is undefined during prerender, where the provider
                  has not mounted, so it must be defaulted before use. */}
              <Languages size={14} /> {(language || 'en').toUpperCase()}
            </button>
          </div>
          
          {/* Offline Indicator */}
          {(isOffline || pendingSyncs > 0) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${isOffline ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
              <WifiOff size={14} /> 
              {isOffline ? 'Offline Mode Active' : `Syncing ${pendingSyncs} items...`}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Quick Actions Tabs */}
          <div className="flex gap-2 bg-slate-900 p-1 rounded-xl mb-8 border border-slate-800">
            {[
              { id: 'guest', icon: UserPlus, label: t('gatekeeper.tabs.guest') },
              { id: 'delivery', icon: Package, label: t('gatekeeper.tabs.delivery') },
              { id: 'cab', icon: Car, label: t('gatekeeper.tabs.cab') },
              { id: 'staff', icon: Users, label: t('gatekeeper.tabs.staff') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : ''} />
                <span className={`text-[10px] font-bold ${activeTab === tab.id ? 'text-white' : ''}`}>{tab.label}</span>
              </button>
            ))}
          </div>

          {status ? (
            <div className="h-64 flex flex-col items-center justify-center text-center animate-fade-in">
              {status === 'waiting' && (
                <>
                  <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                  <h2 className="text-xl font-bold text-white">{t('gatekeeper.status.calling')} {form.host_flat}</h2>
                  <p className="text-slate-400 text-sm mt-2">{t('gatekeeper.status.waiting')}</p>
                </>
              )}
              {status === 'approved' && (
                <>
                  <CheckCircle size={80} className="text-green-500 mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-bounce" />
                  <h2 className="text-2xl font-bold text-green-400">{t('gatekeeper.status.approved')}</h2>
                  <p className="text-slate-300 mt-2">{t('gatekeeper.status.approved_desc')}</p>
                  <button onClick={resetForm} className="mt-8 bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700">{t('gatekeeper.status.log_another')}</button>
                </>
              )}
              {status === 'denied' && (
                <>
                  <XCircle size={80} className="text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                  <h2 className="text-2xl font-bold text-red-400">{t('gatekeeper.status.denied')}</h2>
                  <p className="text-slate-300 mt-2">{t('gatekeeper.status.denied_desc')}</p>
                  <button onClick={resetForm} className="mt-8 bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700">{t('gatekeeper.status.go_back')}</button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-white mb-6">{t('gatekeeper.log_new')}</h2>
              
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{t('gatekeeper.form.flat_no')}</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. A-402"
                  value={form.host_flat}
                  onChange={e => setForm({...form, host_flat: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white text-lg font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:font-normal" 
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{t('gatekeeper.form.visitor_name')}</label>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" 
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{t('gatekeeper.form.phone')}</label>
                <input 
                  type="tel" 
                  required
                  placeholder="+91"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-8 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
              >
                {t('gatekeeper.form.submit')}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
