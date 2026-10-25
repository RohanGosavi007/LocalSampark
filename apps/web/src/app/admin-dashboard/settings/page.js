'use client';
import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Key, Globe, Save, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function SettingsDashboard() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for UI inputs before saving
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [pauseRegistrations, setPauseRegistrations] = useState(false);
  const [defaultLang, setDefaultLang] = useState('en');
  
  // Whether each integration has credentials on the server. The credentials
  // themselves are never sent here: they live in the server's environment.
  const [integrations, setIntegrations] = useState(null);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.data) {
        setSettings(result.data);
        setMaintenanceMode(result.data.maintenance_mode === 'true');
        setPauseRegistrations(result.data.pause_registrations === 'true');
        setDefaultLang(result.data.default_language || 'en');
        setIntegrations(result.data.integrations || null);
      }
    } catch (err) {
      toast.error('Failed to load global settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      
      const payload = {
        maintenance_mode: maintenanceMode.toString(),
        pause_registrations: pauseRegistrations.toString(),
        default_language: defaultLang
      };

      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        fetchSettings();
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (err) {
      toast.error('Network Error');
    } finally {
      setSaving(false);
    }
  };

  const INTEGRATIONS = [
    { key: 'razorpay', label: 'Razorpay (online payments)', detail: (i) => (i.configured ? `Key ${i.keyId}${i.webhookConfigured ? '' : ' · webhook secret not set'}` : null) },
    { key: 'googleMaps', label: 'Google Maps' },
    { key: 'sms', label: 'SMS / OTP (MSG91)' },
  ];

  if (loading) {
    return <div className="text-center py-20 text-slate-500 dark:text-slate-400">Loading Configuration Engine...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Settings className="text-slate-500 dark:text-slate-400" /> Global Configuration Hub
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Master switches, external API integrations, and platform-wide parameters.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5"/> {saving ? 'Saving Changes...' : 'Save All Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Core Platform Toggles */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-8 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Platform God-Switches
            </h2>

            <div className="space-y-8">
              
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-100 dark:bg-slate-800/30 transition-all hover:bg-slate-800/50" style={{ borderColor: maintenanceMode ? 'rgba(244,63,94,0.4)' : 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    Maintenance Mode
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Blocks all regular users from accessing the app, displaying a "Down for Maintenance" screen. Super Admins bypass this.</p>
                </div>
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`transition-all ${maintenanceMode ? 'text-rose-500' : 'text-slate-500'}`}
                >
                  {maintenanceMode ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-100 dark:bg-slate-800/30 transition-all hover:bg-slate-800/50" style={{ borderColor: pauseRegistrations ? 'rgba(245,158,11,0.4)' : 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    Pause New Registrations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Current users can still log in, but the signup flow for completely new users and shops is temporarily disabled.</p>
                </div>
                <button 
                  onClick={() => setPauseRegistrations(!pauseRegistrations)}
                  className={`transition-all ${pauseRegistrations ? 'text-amber-500' : 'text-slate-500'}`}
                >
                  {pauseRegistrations ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-100 dark:bg-slate-800/30 transition-all hover:bg-slate-800/50" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-sky-500"/> Default Platform Language
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Fallback language if user's device locale is unsupported.</p>
                </div>
                <select 
                  value={defaultLang}
                  onChange={e => setDefaultLang(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-lg px-4 py-2 outline-none"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="gj">Gujarati (ગુજરાતી)</option>
                </select>
              </div>

            </div>
          </div>
        </div>

        {/* Third-Party API Keys */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-8 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Key className="w-5 h-5 text-purple-500" /> External Integrations
            </h2>

            {/*
              This card used to hold editable "Razorpay Live Secret" and Google
              Maps key fields. They were saved to the database and sent back to
              this page, and nothing on the server read them: payments have only
              ever used the keys in the server's environment. It now shows which
              integrations the server has credentials for.
            */}
            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl mb-6">
                <p className="text-xs text-purple-400 font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                  Keys and secrets are set in the server environment, not here. Add or change them in the hosting dashboard and restart the API service.
                </p>
              </div>

            <div className="space-y-4">
              {INTEGRATIONS.map(({ key, label, detail }) => {
                const item = integrations && integrations[key];
                const configured = Boolean(item && item.configured);
                return (
                  <div key={key} className="p-4 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{label}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${configured ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-500'}`}>
                        {configured ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                    <p className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {(configured && detail && detail(item)) || (item && item.env ? item.env.join(', ') : '')}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
