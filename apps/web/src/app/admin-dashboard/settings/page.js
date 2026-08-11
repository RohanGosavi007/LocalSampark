'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Settings, Save, Server, Shield, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SystemSettingsPage() {
  const { adminUser } = useAdminAuth();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setConfigs(data.map(c => ({
          ...c,
          // Parse stringified JSON values if needed
          value: typeof c.config_value === 'string' ? c.config_value.replace(/^"|"$/g, '') : c.config_value
        })));
      }
    } catch (err) {
      toast.error('Failed to load system config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const saveConfig = async (key, value, category, description) => {
    try {
      setSaving(key);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/config/${key}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value, category, description })
      });
      const data = await res.json();
      if (data) {
        toast.success(`${key} updated successfully`);
        fetchConfigs();
      }
    } catch (err) {
      toast.error('Failed to update config');
    } finally {
      setSaving(null);
    }
  };

  const updateLocalConfig = (index, newValue) => {
    const updated = [...configs];
    updated[index].value = newValue;
    setConfigs(updated);
  };

  const triggerMaintenance = async (action) => {
    if (!confirm(`Are you sure you want to ${action}? This may impact active users.`)) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/settings/action', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      }
    } catch (err) {
      toast.error('Action failed');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Configurations</h1>
          <p className="text-slate-400">Manage global platform variables, fees, and operational states.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Config Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500"/> Core Variables
            </h2>
            
            {loading ? (
              <div className="text-slate-500 text-center py-8">Loading configurations...</div>
            ) : configs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No configurations found in database.</div>
            ) : (
              <div className="space-y-4">
                {configs.map((config, idx) => (
                  <div key={config.config_key} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold">{config.config_key}</span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{config.config_category}</span>
                      </div>
                      <p className="text-sm text-slate-500">{config.description}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input 
                        type={config.config_value === 'true' || config.config_value === 'false' ? 'text' : 'text'}
                        value={config.value || ''}
                        onChange={(e) => updateLocalConfig(idx, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white w-32 md:w-48 focus:border-blue-500 focus:outline-none"
                      />
                      <button 
                        onClick={() => saveConfig(config.config_key, config.value, config.config_category, config.description)}
                        disabled={saving === config.config_key}
                        className="p-2 bg-blue-600/20 text-blue-500 rounded-lg hover:bg-blue-600/30 transition disabled:opacity-50"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Danger Zone / Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500"/> Quick Actions
            </h2>
            <div className="space-y-3">
              <button onClick={() => triggerMaintenance('Clear Cache')} className="w-full flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500/20"><Server className="w-4 h-4"/></div>
                  <span className="text-white font-medium">Clear Global Cache</span>
                </div>
              </button>
              <button onClick={() => triggerMaintenance('Recalculate Routes')} className="w-full flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500 group-hover:bg-purple-500/20"><Zap className="w-4 h-4"/></div>
                  <span className="text-white font-medium">Recalculate Routes</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-red-950/20 border border-red-900/50 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5"/> Danger Zone
            </h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              These actions have immediate, platform-wide consequences. Ensure you have proper authorization.
            </p>
            <button 
              onClick={() => triggerMaintenance('Toggle Maintenance Mode')} 
              className="w-full py-3 bg-red-600/20 text-red-500 font-bold rounded-xl hover:bg-red-600/30 transition border border-red-600/30"
            >
              Toggle Maintenance Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
