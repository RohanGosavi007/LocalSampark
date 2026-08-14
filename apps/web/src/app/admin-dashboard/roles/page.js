'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Shield, Plus, Save, Trash2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

const AVAILABLE_PERMISSIONS = [
  { key: 'manage_users', label: 'Manage Users', category: 'Core' },
  { key: 'manage_roles', label: 'Manage Roles', category: 'Core' },
  { key: 'manage_finance', label: 'Finance & Payouts', category: 'Finance' },
  { key: 'manage_shops', label: 'Manage Shops', category: 'Ecommerce' },
  { key: 'manage_orders', label: 'Manage Orders', category: 'Ecommerce' },
  { key: 'manage_catalog', label: 'Universal Catalog', category: 'Ecommerce' },
  { key: 'manage_delivery', label: 'Delivery & Logistics', category: 'Logistics' },
  { key: 'manage_community', label: 'Community & SOS', category: 'Social' },
  { key: 'view_analytics', label: 'View Analytics', category: 'Core' }
];

export default function RolesManagementPage() {
  const { adminUser } = useAdminAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  
  // New Role Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState({});

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Parse permissions if they are strings
        const parsedRoles = data.data.map(r => ({
          ...r,
          permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '{}') : (r.permissions || {})
        }));
        setRoles(parsedRoles);
      }
    } catch (err) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const saveRole = async (roleName, permissions, description) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/roles', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role_name: roleName, permissions, description })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Role saved successfully');
        setIsCreating(false);
        setEditingRole(null);
        fetchRoles();
      }
    } catch (err) {
      toast.error('Failed to save role');
    }
  };

  const togglePermission = (roleIndex, permKey) => {
    const updatedRoles = [...roles];
    const role = updatedRoles[roleIndex];
    role.permissions[permKey] = !role.permissions[permKey];
    setRoles(updatedRoles);
    setEditingRole(role.role_name);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Role & Permissions Matrix</h1>
          <p className="text-slate-400">Configure access control levels across the entire platform.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          {isCreating ? <X className="w-5 h-5"/> : <Plus className="w-5 h-5" />}
          {isCreating ? 'Cancel' : 'Create Custom Role'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-slate-900 border border-blue-500/50 rounded-3xl p-6 shadow-xl mb-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500"/> Define New Role</h2>
          <div className="flex gap-4">
            <input 
              type="text" placeholder="Role Name (e.g., region_manager)" 
              value={newRoleName} onChange={e => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 flex-1"
            />
            <input 
              type="text" placeholder="Description" 
              value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 flex-2 w-1/2"
            />
          </div>
          <div className="mt-4">
            <h3 className="text-slate-400 font-bold mb-3 uppercase tracking-wider text-sm">Assign Permissions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {AVAILABLE_PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-600 transition">
                  <input 
                    type="checkbox" 
                    checked={!!newRolePerms[p.key]}
                    onChange={() => setNewRolePerms({...newRolePerms, [p.key]: !newRolePerms[p.key]})}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950"
                  />
                  <div>
                    <p className="text-white font-medium text-sm">{p.label}</p>
                    <p className="text-slate-500 text-xs">{p.category}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button 
              onClick={() => saveRole(newRoleName, newRolePerms, newRoleDesc)}
              disabled={!newRoleName}
              className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" /> Save Role
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider bg-slate-950/50">
                <th className="p-6 font-semibold min-w-[200px]">Permission</th>
                {roles.map(role => (
                  <th key={role.id} className="p-6 font-semibold text-center min-w-[150px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white font-bold">{role.role_name}</span>
                      {editingRole === role.role_name && (
                        <button 
                          onClick={() => saveRole(role.role_name, role.permissions, role.description)}
                          className="mt-2 text-xs bg-emerald-500 text-white px-3 py-1 rounded-full hover:bg-emerald-400 flex items-center gap-1"
                        >
                          <Save className="w-3 h-3"/> Save
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {loading ? (
                <tr><td colSpan={roles.length + 1} className="p-8 text-center text-slate-500">Loading roles...</td></tr>
              ) : AVAILABLE_PERMISSIONS.map(perm => (
                <tr key={perm.key} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition group">
                  <td className="p-6">
                    <p className="font-bold text-white">{perm.label}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{perm.category}</p>
                  </td>
                  {roles.map((role, idx) => (
                    <td key={role.id} className="p-6 text-center border-l border-slate-800/50">
                      <button 
                        onClick={() => togglePermission(idx, perm.key)}
                        className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition ${role.permissions[perm.key] ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                      >
                        {role.permissions[perm.key] ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
