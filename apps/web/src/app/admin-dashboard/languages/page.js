'use client';
import React, { useState, useEffect } from 'react';
import { Globe, Save, CheckCircle, XCircle, Languages, FileJson, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English (Default)', required: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' }
];

export default function LocalizationDashboard() {
  const [activeLanguages, setActiveLanguages] = useState(['en']);
  const [overrides, setOverrides] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/languages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveLanguages(data.data.activeLanguages || ['en']);
        setOverrides(JSON.stringify(data.data.dictionaryOverrides || {}, null, 2));
      } else {
        toast.error(data.error || 'Failed to load localization config');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const toggleLanguage = (code) => {
    if (code === 'en') return; // Cannot disable English
    
    setActiveLanguages(prev => 
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    let parsedOverrides = {};
    try {
      parsedOverrides = JSON.parse(overrides);
    } catch (e) {
      return toast.error('Invalid JSON format in Dictionary Overrides');
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/languages', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          activeLanguages, 
          dictionaryOverrides: parsedOverrides 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Settings saved');
        fetchConfig();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading Localization Engine...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Globe className="text-blue-500" /> Regional Languages
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage active languages globally. English is strictly enforced as the default fallback.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Language Toggles */}
        <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Languages className="w-5 h-5 text-indigo-500" /> Active Languages
          </h2>

          <div className="space-y-3">
            {AVAILABLE_LANGUAGES.map(lang => {
              const isActive = activeLanguages.includes(lang.code);
              return (
                <div 
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${isActive ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-100'}`}
                  style={!isActive ? { backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)' } : {}}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {lang.code.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        {lang.name} 
                        {lang.required && <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded uppercase">Required</span>}
                      </h4>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lang.native}</p>
                    </div>
                  </div>
                  <div>
                    {isActive ? <CheckCircle className="text-indigo-500 w-6 h-6" /> : <XCircle className="text-slate-600 w-6 h-6" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dictionary Overrides */}
        <div className="space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl flex flex-col h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <FileJson className="w-5 h-5 text-emerald-500" /> Dictionary Overrides
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Force update specific translations without an app update. Must be valid JSON.
            </p>

            <div className="flex-1 bg-slate-950 rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
              <div className="bg-slate-900 px-4 py-2 border-b text-[10px] font-mono flex gap-4" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                <span>File: overrides.json</span>
                <span>Language Map: {`{"hi": {"Cart": "झोला"}}`}</span>
              </div>
              <textarea 
                value={overrides}
                onChange={e => setOverrides(e.target.value)}
                className="w-full flex-1 p-4 bg-transparent outline-none font-mono text-sm resize-none"
                style={{ color: 'var(--text-main)' }}
                spellCheck="false"
              />
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Saving these settings will instantly purge the Global App Cache and force a sync for all active users.</span>
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 font-black rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #4f46e5)' }}
              >
                <Save className="w-5 h-5" /> {saving ? 'Syncing Globally...' : 'SAVE & PURGE CACHE'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
