'use client';
import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Download, ShieldAlert, Cloud, CheckCircle, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BackupsDashboard() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [provider, setProvider] = useState('AWS S3');

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/backups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setBackups(result.data);
      }
    } catch (err) {
      toast.error('Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleGenerateBackup = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/backups/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        // Wait a bit for the async creation to finish before fetching
        setTimeout(fetchBackups, 1600);
      } else {
        toast.error(result.error || 'Failed to trigger backup');
      }
    } catch (err) {
      toast.error('Network Error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("CRITICAL WARNING: This will overwrite the current live database. Are you absolutely sure?")) return;
    
    setRestoringId(id);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/backups/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to restore database');
      }
    } catch (err) {
      toast.error('Network Error');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Database className="text-orange-500" /> Disaster Recovery
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Automated SQLite snapshots and cloud backup management.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchBackups}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4"/> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <ShieldAlert className="w-5 h-5 text-orange-500" /> Snapshot Controls
            </h2>

            <div className="space-y-4">
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Cloud Storage Target</label>
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-800/50" style={{ borderColor: 'var(--border-color)' }}>
                  <Cloud className="w-5 h-5 text-sky-400"/>
                  <select 
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm font-bold text-white appearance-none"
                  >
                    <option>AWS S3</option>
                    <option>Google Cloud Storage</option>
                    <option>Azure Blob Storage</option>
                  </select>
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl mt-4">
                <p className="text-xs text-orange-400 font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                  Generating a manual snapshot will momentarily lock the SQLite database for reads/writes.
                </p>
              </div>

              <button 
                onClick={handleGenerateBackup}
                disabled={generating}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                <HardDrive className="w-4 h-4" /> {generating ? 'Compressing Database...' : 'Generate Instant Snapshot'}
              </button>
            </div>
          </div>
        </div>

        {/* Backup Vault Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>
              <Database className="w-5 h-5 text-emerald-500" /> Backup Vault
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading backups...</div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                <ShieldAlert className="w-12 h-12 text-slate-700 mb-4"/>
                <p>No database snapshots found in vault.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map(backup => (
                  <div key={backup.id} className="p-4 border rounded-xl flex items-center justify-between group transition hover:border-orange-500/50" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-500"/>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
                          {backup.filename}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded border bg-sky-500/10 text-sky-500 border-sky-500/30 flex items-center gap-1">
                            <Cloud className="w-3 h-3"/> {backup.provider}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{backup.size_mb} MB</span>
                          <span className="text-xs text-slate-500">{new Date(backup.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoringId === backup.id}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3"/> {restoringId === backup.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button 
                        onClick={() => toast.success('Download started')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        title="Download locally"
                      >
                        <Download className="w-4 h-4"/>
                      </button>
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
