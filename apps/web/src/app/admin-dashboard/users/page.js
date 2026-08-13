'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Search, Filter, ShieldAlert, CheckCircle, XCircle, MoreVertical, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UsersManagementPage() {
  const { adminUser } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [editingUserId, setEditingUserId] = useState(null);
  const [editRole, setEditRole] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/users?page=${page}&search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const toggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/users/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const saveRole = async (id) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: editRole })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setEditingUserId(null);
        fetchUsers();
      }
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-slate-400">Manage all platform users, roles, and access statuses.</p>
        </div>
        <button 
          onClick={() => {
            const token = localStorage.getItem('admin_token');
            window.open(`http://localhost:5000/api/v1/admin/export/users?token=${token}`, '_blank');
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition"
        >
          <Download className="w-5 h-5" /> Export CSV
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by phone or name..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <button className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading users...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition group">
                  <td className="p-4 font-medium text-white">{user.full_name || 'Anonymous'}</td>
                  <td className="p-4">{user.phone}</td>
                  <td className="p-4">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2">
                        <select 
                          value={editRole} 
                          onChange={e => setEditRole(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="rider">Rider</option>
                          <option value="vendor">Vendor</option>
                        </select>
                        <button onClick={() => saveRole(user.id)} className="text-emerald-500 hover:text-emerald-400 p-1"><CheckCircle className="w-4 h-4"/></button>
                        <button onClick={() => setEditingUserId(null)} className="text-red-500 hover:text-red-400 p-1"><XCircle className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1">
                        {user.role === 'admin' && <ShieldAlert className="w-3 h-3 text-purple-500"/>}
                        {user.role || 'user'}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={\`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-bold \${user.is_active !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}\`}>
                      {user.is_active !== false ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        onClick={() => { setEditingUserId(user.id); setEditRole(user.role || 'user'); }}
                        className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                        title="Edit Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(user.id, user.is_active !== false)}
                        className={\`p-2 rounded-lg transition \${user.is_active !== false ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}\`}
                        title={user.is_active !== false ? "Block User" : "Unblock User"}
                      >
                        {user.is_active !== false ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-800">
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700"
            >
              Previous
            </button>
            <button 
              disabled={page === totalPages || totalPages === 0} 
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
