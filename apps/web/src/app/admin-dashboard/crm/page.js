'use client';
import React, { useState, useEffect } from 'react';
import { Contact, Search, Star, Send, ShieldAlert, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function CRMDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/crm/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const adjustLoyalty = async () => {
    if (!selectedUser || !loyaltyPoints || !loyaltyReason) return toast.error('Fill all fields');
    
    setAdjusting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/crm/loyalty', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser.id, points: parseInt(loyaltyPoints), reason: loyaltyReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setLoyaltyPoints(0);
        setLoyaltyReason('');
        fetchUsers();
        // Update local state for immediate feedback
        setSelectedUser({
          ...selectedUser,
          loyalty_points: (parseInt(selectedUser.loyalty_points) || 0) + parseInt(loyaltyPoints)
        });
      }
    } catch (err) {
      toast.error('Failed to adjust points');
    } finally {
      setAdjusting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.phone_number || '').includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <Contact className="text-cyan-500" /> CRM & Engagement
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage user loyalty, send direct messages, and handle VIPs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Directory */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border outline-none font-bold bg-white dark:bg-slate-900 shadow-xl"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-500">
                  <tr>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">User</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Contact</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Loyalty Pts</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-8 text-slate-500 dark:text-slate-400">Loading directory...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-8 text-slate-500 dark:text-slate-400">No users found.</td></tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{user.full_name || 'Anonymous'}</div>
                          <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{user.role}</div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-300">{user.phone_number}</td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded w-max">
                            <Star className="w-3 h-3"/> {user.loyalty_points || 0}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="px-4 py-1.5 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 font-bold rounded-lg transition"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <div className="space-y-6">
              
              {/* User Profile Card */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 text-cyan-500 flex items-center justify-center font-black text-2xl mb-4">
                  {(selectedUser.full_name || 'U')[0].toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.full_name || 'Anonymous'}</h2>
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{selectedUser.phone_number}</p>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-500">Current Balance</span>
                  <span className="text-xl font-black text-yellow-500 flex items-center gap-1">
                    <Star className="w-5 h-5"/> {selectedUser.loyalty_points || 0}
                  </span>
                </div>
              </div>

              {/* Loyalty Controls */}
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h3 className="font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
                  <Award className="w-4 h-4 text-cyan-500" /> Adjust Points
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 mb-1 block">Points (Use - to deduct)</label>
                    <input
                      type="number"
                      value={loyaltyPoints}
                      onChange={e => setLoyaltyPoints(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border bg-transparent outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 mb-1 block">Reason for adjustment</label>
                    <input
                      type="text"
                      placeholder="e.g. Apology for late delivery"
                      value={loyaltyReason}
                      onChange={e => setLoyaltyReason(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border bg-transparent outline-none text-sm text-slate-900 dark:text-white focus:border-cyan-500"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                  </div>
                  <button 
                    onClick={adjustLoyalty}
                    disabled={adjusting}
                    className="w-full py-2.5 mt-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition disabled:opacity-50"
                  >
                    Confirm Adjustment
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-8 shadow-xl text-center flex flex-col items-center justify-center min-h-[400px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-500 font-bold">Select a user to manage</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
