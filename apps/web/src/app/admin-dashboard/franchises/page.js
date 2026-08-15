'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Search, MapPin, Users, DollarSign, Activity, Percent, Save, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function FranchisesManagementPage() {
  const { adminUser } = useAdminAuth();
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingSplit, setEditingSplit] = useState(null);
  const [splitValue, setSplitValue] = useState('');

  const fetchFranchises = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/franchises?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFranchises(data.data || data.franchises || []);
      }
    } catch (err) {
      toast.error('Failed to load franchises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFranchises();
  }, [search]);

  const updateSplit = async (id) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/franchises/${id}/split`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ split_percentage: parseFloat(splitValue) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Revenue split updated');
        setEditingSplit(null);
        fetchFranchises();
      }
    } catch (err) {
      toast.error('Failed to update split');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Franchise & Territory Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage regional partners, territories, and revenue splits.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search franchises or territories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Territory</th>
                <th className="p-4 font-semibold">Partner Name</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Rev Split</th>
                <th className="p-4 font-semibold">Joined Date</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-slate-300">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-500">Loading territories...</td></tr>
              ) : (!Array.isArray(franchises) || franchises.length === 0) ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-500">No franchises found.</td></tr>
              ) : franchises.map(f => (
                <tr key={f.id} className="border-b border-slate-200 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/20 transition group">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500"/> {f.territory_name || f.territory_pincode || 'Unassigned'}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{f.user_name || 'Unassigned'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-bold ${f.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {f.status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-4">
                    {editingSplit === f.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={splitValue}
                          onChange={e => setSplitValue(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white w-20"
                        />
                        <button onClick={() => updateSplit(f.id)} className="text-emerald-500 hover:text-emerald-400 p-1"><Save className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">{f.revenue_split || 0}%</span>
                        <button onClick={() => { setEditingSplit(f.id); setSplitValue(f.revenue_split || 0); }} className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition"><Edit className="w-4 h-4"/></button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-500 text-sm">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
