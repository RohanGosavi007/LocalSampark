'use client';
import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Download, Filter, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(API_BASE + '/admin/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setLogs(data.data);
        }
      } catch (err) {
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    JSON.stringify(log).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <ShieldCheck className="text-purple-500" /> Global Audit Trail
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Strict immutable record of all Super Admin configurations and Kill-Switch engagements.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl flex items-center gap-2 font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
            <Download size={18} /> Export JSON
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="p-4 border-b flex gap-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search logs by action or admin ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <button className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
            <Filter size={16} /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ color: 'var(--text-main)' }}>
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-xs uppercase" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider">Timestamp</th>
                <th className="px-6 py-4 font-bold tracking-wider">Admin ID</th>
                <th className="px-6 py-4 font-bold tracking-wider">Action</th>
                <th className="px-6 py-4 font-bold tracking-wider">Target</th>
                <th className="px-6 py-4 font-bold tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading audit trail...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center flex flex-col items-center">
                    <FileText className="w-12 h-12 mb-3 opacity-20" />
                    <p style={{ color: 'var(--text-muted)' }}>No audit logs match your search.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-slate-100/20 dark:hover:bg-slate-800/20 transition" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-xs">{log.admin_id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider" style={{ 
                        backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' 
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.target_type}</td>
                    <td className="px-6 py-4 max-w-xs truncate font-mono text-xs opacity-70" title={log.details}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
