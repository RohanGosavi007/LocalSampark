'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { API_URL, getAuthHeaders, apiGet, apiPost, apiDelete } from '@/lib/api';
import { Search, MapPin, User, Trash2, Plus, Filter, CheckCircle, XCircle } from 'lucide-react';

/**
 * TerritoryAssignment — SuperAdmin territory-to-franchise RBAC manager.
 */
export default function TerritoryAssignment() {
  const [territories, setTerritories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | assigned | unassigned
  const [showAssignModal, setShowAssignModal] = useState(null); // territoryId
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [terrRes, assignRes, userRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/zones/hierarchy/v2`, { headers: getAuthHeaders() }).then(r => r.json()),
        fetch(`${API_URL}/api/v1/admin/territory-assignments`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_URL}/api/v1/admin/users?role=territory_admin,franchise_owner&limit=500`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => ({ users: [] })),
      ]);

      setTerritories(terrRes?.data?.territories || []);
      setAssignments(assignRes?.data || []);
      setUsers(userRes?.users || userRes?.data || []);
    } catch (e) { console.error('Load failed:', e); }
    setLoading(false);
  };

  const assignmentMap = useMemo(() => {
    const map = {};
    assignments.forEach(a => { map[a.territory_id] = a; });
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    let list = territories;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name?.toLowerCase().includes(q) || t.pincode?.includes(q));
    }
    if (filterStatus === 'assigned') list = list.filter(t => assignmentMap[t.id]);
    if (filterStatus === 'unassigned') list = list.filter(t => !assignmentMap[t.id]);
    return list;
  }, [territories, search, filterStatus, assignmentMap]);

  const handleAssign = async (territoryId) => {
    if (!selectedUserId) return;
    try {
      await apiPost('/admin/assign-territory', {
        userId: selectedUserId,
        territoryId,
        role: 'territory_franchise'
      });
      setShowAssignModal(null);
      setSelectedUserId('');
      loadData();
    } catch (e) { alert('Assignment failed: ' + e.message); }
  };

  const handleRemove = async (assignmentId) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await apiDelete(`/admin/territory-assignments/${assignmentId}`);
      loadData();
    } catch (e) { alert('Removal failed: ' + e.message); }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading territories...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
        🗺️ Territory Assignments
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
        Assign franchise partners to territories for RBAC hard partitioning
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text" placeholder="Search territory or pincode..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 10px 10px 38px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none', fontSize: '14px'
            }}
          />
        </div>
        {['all', 'assigned', 'unassigned'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: filterStatus === s ? 'linear-gradient(135deg, #e94560, #ff6b6b)' : 'rgba(255,255,255,0.06)',
              color: '#fff', border: 'none', cursor: 'pointer', textTransform: 'capitalize'
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.2)' }}>
          <span style={{ color: '#4fc3f7', fontWeight: '700', fontSize: '18px' }}>{territories.length}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px', fontSize: '13px' }}>Territories</span>
        </div>
        <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)' }}>
          <span style={{ color: '#4caf50', fontWeight: '700', fontSize: '18px' }}>{assignments.length}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px', fontSize: '13px' }}>Assigned</span>
        </div>
        <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.2)' }}>
          <span style={{ color: '#ff9800', fontWeight: '700', fontSize: '18px' }}>{territories.length - assignments.length}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px', fontSize: '13px' }}>Unassigned</span>
        </div>
      </div>

      {/* Territory List */}
      <div style={{ display: 'grid', gap: '8px' }}>
        {filtered.map(t => {
          const assignment = assignmentMap[t.id];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {assignment ? <CheckCircle size={18} color="#4caf50" /> : <XCircle size={18} color="rgba(255,255,255,0.15)" />}
                <div>
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{t.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: '8px' }}>{t.pincode}</span>
                  {assignment && (
                    <p style={{ color: 'rgba(79,195,247,0.8)', fontSize: '12px', marginTop: '2px' }}>
                      👤 {assignment.user_name || assignment.user_id}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {assignment ? (
                  <button onClick={() => handleRemove(assignment.id)}
                    style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(244,67,54,0.1)', color: '#f44336', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <button onClick={() => setShowAssignModal(t.id)}
                    style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(76,175,80,0.1)', color: '#4caf50', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                    <Plus size={14} /> Assign
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '400px', padding: '24px', borderRadius: '16px',
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontWeight: '700' }}>Assign Franchise Partner</h3>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px', marginBottom: '16px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none'
              }}>
              <option value="">Select user...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.name || u.phone}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAssignModal(null); setSelectedUserId(''); }}
                style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleAssign(showAssignModal)}
                style={{ padding: '8px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #4caf50, #81c784)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
