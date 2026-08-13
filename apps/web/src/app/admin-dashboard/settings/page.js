'use client';
import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Key, Globe, EyeOff, Eye, Save, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsDashboard() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for UI inputs before saving
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [pauseRegistrations, setPauseRegistrations] = useState(false);
  const [defaultLang, setDefaultLang] = useState('en');
  
  const [razorpayKey, setRazorpayKey] = useState('');
  const [gmapsKey, setGmapsKey] = useState('');
  
  const [showRzp, setShowRzp] = useState(false);
  const [showGmaps, setShowGmaps] = useState(false);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.data) {
        setSettings(result.data);
        setMaintenanceMode(result.data.maintenance_mode === 'true');
        setPauseRegistrations(result.data.pause_registrations === 'true');
        setDefaultLang(result.data.default_language || 'en');
        setRazorpayKey(result.data.api_key_razorpay || '');
        setGmapsKey(result.data.api_key_gmaps || '');
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
        default_language: defaultLang,
        api_key_razorpay: razorpayKey,
        api_key_gmaps: gmapsKey
      };

      const res = await fetch(`http://localhost:5000/api/v1/admin/settings`, {
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
        fetchSettings(); // reload obfuscated data
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (err) {
      toast.error('Network Error');
    } finally {
      setSaving(false);
    }
  };

  // Helper to obfuscate string: show first 8 chars, mask the rest
  const obfuscate = (key, show) => {
    if (show) return key;
    if (!key || key.length < 10) return '********';
    return key.substring(0, 8) + '********';
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Loading Configuration Engine...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Settings className="text-slate-400" /> Global Configuration Hub
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
          <div className="bg-slate-900 border rounded-3xl p-8 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Platform God-Switches
            </h2>

            <div className="space-y-8">
              
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-800/30 transition-all hover:bg-slate-800/50" style={{ borderColor: maintenanceMode ? 'rgba(244,63,94,0.4)' : 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    Maintenance Mode
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Blocks all regular users from accessing the app, displaying a "Down for Maintenance" screen. Super Admins bypass this.</p>
                </div>
                <button 
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`transition-all ${maintenanceMode ? 'text-rose-500' : 'text-slate-500'}`}
                >
                  {maintenanceMode ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-800/30 transition-all hover:bg-slate-800/50" style={{ borderColor: pauseRegistrations ? 'rgba(245,158,11,0.4)' : 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    Pause New Registrations
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Current users can still log in, but the signup flow for completely new users and shops is temporarily disabled.</p>
                </div>
                <button 
                  onClick={() => setPauseRegistrations(!pauseRegistrations)}
                  className={`transition-all ${pauseRegistrations ? 'text-amber-500' : 'text-slate-500'}`}
                >
                  {pauseRegistrations ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border bg-slate-800/30 transition-all hover:bg-slate-800/50" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-sky-500"/> Default Platform Language
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">Fallback language if user's device locale is unsupported.</p>
                </div>
                <select 
                  value={defaultLang}
                  onChange={e => setDefaultLang(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-2 outline-none"
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
          <div className="bg-slate-900 border rounded-3xl p-8 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Key className="w-5 h-5 text-purple-500" /> External API Keys
            </h2>
            
            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl mb-6">
                <p className="text-xs text-purple-400 font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                  Keys are automatically obfuscated for security. Modifying these keys will immediately affect live production pipelines.
                </p>
              </div>

            <div className="space-y-6">
              
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-2 flex justify-between text-slate-400">
                  Razorpay Live Secret
                  <button onClick={() => setShowRzp(!showRzp)} className="text-sky-500 flex items-center gap-1 hover:text-sky-400">
                    {showRzp ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>} {showRzp ? 'Hide' : 'Reveal'}
                  </button>
                </label>
                <input 
                  type="text" 
                  value={obfuscate(razorpayKey, showRzp)}
                  onChange={e => {
                    // Only update if they are editing the raw key (not the masked one)
                    if (showRzp) setRazorpayKey(e.target.value);
                  }}
                  readOnly={!showRzp}
                  className="w-full px-4 py-3 rounded-xl border outline-none font-mono text-sm transition-all focus:border-purple-500"
                  style={{ backgroundColor: showRzp ? '#1e293b' : 'var(--bg-base)', borderColor: showRzp ? 'rgb(168, 85, 247)' : 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-2 flex justify-between text-slate-400">
                  Google Maps API Key
                  <button onClick={() => setShowGmaps(!showGmaps)} className="text-sky-500 flex items-center gap-1 hover:text-sky-400">
                    {showGmaps ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>} {showGmaps ? 'Hide' : 'Reveal'}
                  </button>
                </label>
                <input 
                  type="text" 
                  value={obfuscate(gmapsKey, showGmaps)}
                  onChange={e => {
                    if (showGmaps) setGmapsKey(e.target.value);
                  }}
                  readOnly={!showGmaps}
                  className="w-full px-4 py-3 rounded-xl border outline-none font-mono text-sm transition-all focus:border-purple-500"
                  style={{ backgroundColor: showGmaps ? '#1e293b' : 'var(--bg-base)', borderColor: showGmaps ? 'rgb(168, 85, 247)' : 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
