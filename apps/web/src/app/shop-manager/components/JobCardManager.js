'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Search, RefreshCw, Plus, Phone, Camera, Clock,
  CheckCircle, ArrowRight, AlertTriangle, User, ChevronDown,
  ChevronUp, Send, Shield, FileText, Truck
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// JOB CARD MANAGER — Garage, Repair, Laundry, Mobile Repair
// Kanban: Received → Inspection → Estimate → Approved → In Repair → QC → Ready → Delivered
// ═══════════════════════════════════════════════════════════════════════

const JOB_STATUSES = [
  { key: 'received',      label: 'Received',     color: '#f59e0b', emoji: '📥' },
  { key: 'inspection',    label: 'Inspection',   color: '#6366f1', emoji: '🔍' },
  { key: 'estimate_sent', label: 'Estimate Sent',color: '#0ea5e9', emoji: '📋' },
  { key: 'approved',      label: 'Approved',     color: '#22c55e', emoji: '✅' },
  { key: 'in_repair',     label: 'In Repair',    color: '#f97316', emoji: '🔧' },
  { key: 'quality_check', label: 'QC',           color: '#8b5cf6', emoji: '🔬' },
  { key: 'ready',         label: 'Ready',        color: '#06b6d4', emoji: '📦' },
  { key: 'delivered',     label: 'Delivered',    color: '#22c55e', emoji: '🎉' },
];

const STATUS_TRANSITIONS = {
  received: 'inspection',
  inspection: 'estimate_sent',
  estimate_sent: 'approved', // customer approves
  approved: 'in_repair',
  in_repair: 'quality_check',
  quality_check: 'ready',
  ready: 'delivered',
};

export default function JobCardManager({ token, shopId, categoryType = 'garage' }) {
  const [jobCards, setJobCards] = useState([]);
  const [activeStatus, setActiveStatus] = useState('received');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shops/my-shop/job-cards?status=${activeStatus}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setJobCards(data.jobCards || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token, activeStatus]);

  useEffect(() => { fetchJobCards(); }, [fetchJobCards]);

  const updateJobCard = async (jobCardId, updates) => {
    try {
      const res = await fetch(`${API_BASE}/shops/my-shop/job-cards/${jobCardId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if ((await res.json()).success) fetchJobCards();
    } catch (err) { console.error(err); }
  };

  const moveToNext = (jobCard) => {
    const nextStatus = STATUS_TRANSITIONS[jobCard.status];
    if (nextStatus) updateJobCard(jobCard.id, { status: nextStatus });
  };

  const createJobCard = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/shops/my-shop/job-cards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if ((await res.json()).success) {
        setShowCreateForm(false);
        fetchJobCards();
      }
    } catch (err) { console.error(err); }
  };

  const itemTypeLabel = categoryType === 'garage' ? 'Vehicle' : categoryType === 'mobile' ? 'Device' : categoryType === 'laundry' ? 'Garment Bag' : 'Item';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ─── HEADER ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>
          🔧 Job Card Board
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> New Job Card
        </button>
      </div>

      {/* ─── STATUS PIPELINE ─────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '4px', overflowX: 'auto', padding: '4px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {JOB_STATUSES.map(status => {
          const isActive = activeStatus === status.key;
          const count = isActive ? jobCards.length : 0;
          return (
            <button
              key={status.key}
              onClick={() => setActiveStatus(status.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600,
                background: isActive ? `${status.color}20` : 'transparent',
                color: isActive ? status.color : '#64748b',
                transition: 'all 0.2s',
              }}
            >
              <span>{status.emoji}</span>
              {status.label}
              {isActive && count > 0 && (
                <span style={{
                  background: status.color, color: '#fff', borderRadius: '8px',
                  padding: '1px 7px', fontSize: '10px', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── CREATE FORM MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              padding: '24px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }}>
              Create New Job Card
            </h3>
            <CreateJobCardForm
              onSubmit={createJobCard}
              onCancel={() => setShowCreateForm(false)}
              itemTypeLabel={itemTypeLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── JOB CARDS ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : jobCards.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <Wrench size={48} style={{ color: '#475569', marginBottom: '12px' }} />
          <p style={{ color: '#64748b' }}>No job cards with this status</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {jobCards.map((jc, idx) => {
            const statusConfig = JOB_STATUSES.find(s => s.key === jc.status) || JOB_STATUSES[0];
            const nextStatus = STATUS_TRANSITIONS[jc.status];
            const nextConfig = nextStatus ? JOB_STATUSES.find(s => s.key === nextStatus) : null;
            const isExpanded = expandedId === jc.id;
            const progressPhotos = (() => { try { return JSON.parse(jc.progress_photos || '[]'); } catch { return []; } })();
            const estimateItems = (() => { try { return JSON.parse(jc.estimate_items || '[]'); } catch { return []; } })();

            return (
              <motion.div
                key={jc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  borderRadius: '14px', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${statusConfig.color}25`,
                }}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : jc.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      minWidth: '48px', padding: '8px', textAlign: 'center',
                      borderRadius: '10px', background: `${statusConfig.color}20`,
                    }}>
                      <p style={{ color: statusConfig.color, fontSize: '14px', fontWeight: 800, margin: 0 }}>
                        {jc.job_number}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                        {jc.title}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0' }}>
                        {jc.customer_name || 'Walk-in'} • {jc.item_type} {jc.item_identifier || ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {jc.priority === 'urgent' && <AlertTriangle size={16} color="#f59e0b" />}
                    {jc.priority === 'emergency' && <AlertTriangle size={16} color="#ef4444" />}
                    <span style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                      background: `${statusConfig.color}20`, color: statusConfig.color,
                    }}>
                      {statusConfig.label}
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
                      <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {jc.description && (
                          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '10px 0' }}>{jc.description}</p>
                        )}

                        {/* Estimate */}
                        <div style={{
                          display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap',
                        }}>
                          {jc.estimated_cost > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={14} color="#0ea5e9" />
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Estimate: <b style={{ color: '#e2e8f0' }}>₹{jc.estimated_cost}</b></span>
                            </div>
                          )}
                          {jc.final_cost > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle size={14} color="#22c55e" />
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Final: <b style={{ color: '#22c55e' }}>₹{jc.final_cost}</b></span>
                            </div>
                          )}
                          {jc.warranty_days > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Shield size={14} color="#8b5cf6" />
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{jc.warranty_days} days warranty</span>
                            </div>
                          )}
                        </div>

                        {/* Customer contact */}
                        {jc.customer_phone && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={14} color="#22c55e" />
                            <a href={`tel:${jc.customer_phone}`} style={{ color: '#22c55e', fontSize: '13px', textDecoration: 'none' }}>
                              {jc.customer_phone}
                            </a>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                          {nextConfig && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveToNext(jc); }}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '10px', borderRadius: '10px', border: 'none',
                                background: `linear-gradient(135deg, ${nextConfig.color}, ${nextConfig.color}cc)`,
                                color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              Move to {nextConfig.label} <ArrowRight size={14} />
                            </button>
                          )}
                          {jc.customer_id && jc.status === 'estimate_sent' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); /* send estimate notification */ }}
                              style={{
                                padding: '10px 16px', borderRadius: '10px',
                                border: '1px solid #0ea5e950', background: 'transparent',
                                color: '#0ea5e9', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                              }}
                            >
                              <Send size={14} /> Resend Estimate
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

// ─── CREATE JOB CARD FORM ──────────────────────────────────────────
function CreateJobCardForm({ onSubmit, onCancel, itemTypeLabel }) {
  const [form, setForm] = useState({
    title: '', description: '', itemType: '', itemIdentifier: '',
    estimatedCost: '', priority: 'normal',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    onSubmit({
      ...form,
      estimatedCost: parseFloat(form.estimatedCost) || 0,
    });
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0', fontSize: '14px', outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        placeholder="Job title (e.g., Engine oil change, Screen replacement)"
        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
        style={inputStyle} required
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <input
          placeholder={`${itemTypeLabel} type (e.g., Bike, Laptop)`}
          value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder={`${itemTypeLabel} ID (e.g., MH12AB1234)`}
          value={form.itemIdentifier} onChange={e => setForm({ ...form, itemIdentifier: e.target.value })}
          style={inputStyle}
        />
      </div>
      <textarea
        placeholder="Description / issue details"
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <input
          type="number" placeholder="Estimated cost (₹)"
          value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
          style={inputStyle}
        />
        <select
          value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="normal">Normal Priority</option>
          <option value="urgent">🟡 Urgent</option>
          <option value="emergency">🔴 Emergency</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button type="submit" style={{
          flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          Create Job Card
        </button>
        <button type="button" onClick={onCancel} style={{
          padding: '12px 20px', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
          color: '#94a3b8', fontSize: '14px', cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
