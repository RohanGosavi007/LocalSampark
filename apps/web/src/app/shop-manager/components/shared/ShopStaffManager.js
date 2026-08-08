'use client';
import React, { useState } from 'react';
import {
  Users, Plus, Edit2, Trash2, Shield, Phone, Mail,
  CheckCircle, XCircle, Search, Clock, CreditCard, ChevronDown
} from 'lucide-react';

const DEMO_STAFF = [
  { id: 's1', name: 'Ramesh Kumar', role: 'Store Manager', phone: '+91 98765 00001', email: 'ramesh@example.com', status: 'Active', joined: 'Jan 2024', shift: 'Morning (8AM - 4PM)', commission: 0 },
  { id: 's2', name: 'Suresh Patil', role: 'Cashier', phone: '+91 98765 00002', email: 'suresh@example.com', status: 'Active', joined: 'Mar 2024', shift: 'Evening (2PM - 10PM)', commission: 0 },
  { id: 's3', name: 'Amit Singh', role: 'Delivery Agent', phone: '+91 98765 00003', email: 'amit@example.com', status: 'On Leave', joined: 'May 2024', shift: 'Flexible', commission: 450 },
  { id: 's4', name: 'Priya Sharma', role: 'Inventory Clerk', phone: '+91 98765 00004', email: 'priya@example.com', status: 'Active', joined: 'Jun 2024', shift: 'Morning (8AM - 4PM)', commission: 0 },
];

const ROLES = ['Store Manager', 'Cashier', 'Inventory Clerk', 'Delivery Agent', 'Chef/Cook', 'Cleaner'];
const SHIFTS = ['Morning (8AM - 4PM)', 'Evening (2PM - 10PM)', 'Night (10PM - 6AM)', 'Flexible'];

const EMPTY_STAFF = { name: '', role: 'Cashier', phone: '', email: '', status: 'Active', shift: 'Morning (8AM - 4PM)' };

export default function ShopStaffManager() {
  const [staff, setStaff] = useState(DEMO_STAFF);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_STAFF);

  const openAdd = () => { setForm(EMPTY_STAFF); setEditingId(null); setShowModal(true); };
  const openEdit = (member) => { setForm({ ...member }); setEditingId(member.id); setShowModal(true); };

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    if (editingId) {
      setStaff(prev => prev.map(s => s.id === editingId ? { ...form, id: editingId } : s));
    } else {
      setStaff(prev => [...prev, { ...form, id: `s${Date.now()}`, joined: 'Just Now', commission: 0 }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  const filtered = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} /> Staff Management
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage your employees, their roles, shifts, and commissions</p>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
          <Plus size={16} /> Add Staff Member
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
        
        {/* Main List */}
        <div style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search staff by name, role, or phone..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '0.625rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                {['Staff Details', 'Role & Shift', 'Contact', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.875rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light, rgba(99,102,241,0.1))', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Joined {s.joined}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Shield size={12} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.role}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Clock size={12} /> {s.shift}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Phone size={12} style={{ color: 'var(--text-muted)' }} /> {s.phone}</span>
                      {s.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)' }}><Mail size={12} /> {s.email}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: s.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: s.status === 'Active' ? '#10b981' : '#f59e0b' }}>
                      {s.status === 'Active' ? <CheckCircle size={12} /> : <XCircle size={12} />} {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(s)} style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', background: 'transparent', cursor: 'pointer', color: 'var(--primary)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} style={{ padding: '0.3rem 0.5rem', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', background: 'transparent', cursor: 'pointer', color: 'var(--error)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No staff members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Sidebar - Commission / Payouts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} style={{ color: '#10b981' }} /> Pending Commissions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {staff.filter(s => s.commission > 0).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{s.role}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#10b981' }}>₹{s.commission}</div>
                </div>
              ))}
              {staff.filter(s => s.commission > 0).length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No pending commissions</div>
              )}
              {staff.filter(s => s.commission > 0).length > 0 && (
                <button style={{ width: '100%', padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Pay All Dues
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '1.25rem', border: '1px solid var(--border)', padding: '2rem', width: '100%', maxWidth: 500 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editingId ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Full Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramesh Kumar"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem' }}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Shift</label>
                  <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem' }}>
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Phone Number *</label>
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91..."
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'var(--background)', fontSize: '0.875rem' }}>
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.75rem', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '0.75rem', border: 'none', borderRadius: '0.75rem', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
                {editingId ? 'Save Changes' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
