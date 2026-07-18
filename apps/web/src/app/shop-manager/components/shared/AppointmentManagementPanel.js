'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle, XCircle, User, Phone, Search,
  RefreshCw, ChevronDown, ChevronUp, UserCheck, PlayCircle,
  AlertCircle, MapPin, MessageCircle, ArrowRight
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

const APPOINTMENT_STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: '#fef3c7', icon: AlertCircle, action: 'Confirm',        nextStatus: 'confirmed' },
  confirmed:   { label: 'Confirmed',   color: '#3b82f6', bg: '#dbeafe', icon: CheckCircle, action: 'Check In',       nextStatus: 'checked_in' },
  checked_in:  { label: 'Checked In',  color: '#8b5cf6', bg: '#ede9fe', icon: UserCheck,   action: 'Start Service',  nextStatus: 'in_progress' },
  in_progress: { label: 'In Progress', color: '#06b6d4', bg: '#cffafe', icon: PlayCircle,  action: 'Complete',       nextStatus: 'completed' },
  completed:   { label: 'Completed',   color: '#22c55e', bg: '#dcfce7', icon: CheckCircle,  action: null,             nextStatus: null },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: '#fee2e2', icon: XCircle,      action: null,             nextStatus: null },
  no_show:     { label: 'No Show',     color: '#f43f5e', bg: '#ffe4e6', icon: XCircle,      action: null,             nextStatus: null },
};

const TODAY_TABS = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed'];

export default function AppointmentManagementPanel({ token, shopId }) {
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/shops/my-shop/appointments?status=${activeTab}&date=${selectedDate}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/shops/my-shop/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if ((await res.json()).success) {
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
      }
    } catch (err) { console.error('Failed:', err); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    await handleStatusUpdate(id, 'cancelled');
  };

  const handleNoShow = async (id) => {
    if (!confirm('Mark customer as No Show?')) return;
    await handleStatusUpdate(id, 'no_show');
  };

  const filtered = appointments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.customer_name?.toLowerCase().includes(q) || a.customer_phone?.includes(q) || a.service_name?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ─── DATE PICKER + TABS ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
            fontSize: '14px', cursor: 'pointer',
          }}
        />
        <div style={{
          display: 'flex', gap: '6px', flex: 1, overflowX: 'auto',
          background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '4px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {TODAY_TABS.map(status => {
            const config = APPOINTMENT_STATUS_CONFIG[status];
            const isActive = activeTab === status;
            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px', border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                  background: isActive ? config.bg : 'transparent',
                  color: isActive ? config.color : '#94a3b8',
                  transition: 'all 0.2s',
                }}
              >
                <config.icon size={14} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SEARCH ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
        padding: '10px 16px', border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Search size={18} style={{ color: '#64748b' }} />
        <input
          type="text" placeholder="Search customer, service..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '14px', width: '100%' }}
        />
      </div>

      {/* ─── TIMELINE VIEW ───────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /> <p>Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <Calendar size={48} style={{ color: '#475569', marginBottom: '12px' }} />
          <p style={{ color: '#64748b' }}>No appointments for this date/status</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((apt, idx) => {
            const config = APPOINTMENT_STATUS_CONFIG[apt.status] || APPOINTMENT_STATUS_CONFIG.pending;
            const isExpanded = expandedId === apt.id;
            return (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
                  border: `1px solid ${config.color}25`, overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Time Badge */}
                    <div style={{
                      minWidth: '56px', padding: '8px 0', textAlign: 'center',
                      borderRadius: '10px', background: config.bg,
                    }}>
                      <p style={{ color: config.color, fontSize: '15px', fontWeight: 800, margin: 0 }}>
                        {apt.time_slot || '—'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                        {apt.service_name || 'Service'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0' }}>
                        {apt.customer_name || 'Customer'} {apt.staff_name ? `• with ${apt.staff_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700 }}>
                      ₹{parseFloat(apt.final_price || apt.price || 0).toFixed(0)}
                    </span>
                    {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 18px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {apt.duration_minutes && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} color="#64748b" />
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{apt.duration_minutes} minutes</span>
                            </div>
                          )}
                          {apt.customer_phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={14} color="#22c55e" />
                              <a href={`tel:${apt.customer_phone}`} style={{ color: '#22c55e', fontSize: '13px', textDecoration: 'none' }}>
                                {apt.customer_phone}
                              </a>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                          {config.action && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(apt.id, config.nextStatus); }}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '10px', borderRadius: '10px', border: 'none',
                                background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                                color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {config.action} <ArrowRight size={14} />
                            </button>
                          )}
                          {apt.status === 'confirmed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleNoShow(apt.id); }}
                              style={{
                                padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid #f43f5e40', background: 'transparent',
                                color: '#f43f5e', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              No Show
                            </button>
                          )}
                          {['pending', 'confirmed'].includes(apt.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancel(apt.id); }}
                              style={{
                                padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid #ef444440', background: 'transparent',
                                color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
