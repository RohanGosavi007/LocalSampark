'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Eye, Phone,
  ChevronDown, ChevronUp, Filter, Search, RefreshCw, Bell,
  MapPin, CreditCard, MessageCircle, ArrowRight, Timer
} from 'lucide-react';

import { API_BASE } from '@/lib/api';
import io from 'socket.io-client';

// ─── STATUS CONFIG ──────────────────────────────────────────────
const ORDER_STATUS_CONFIG = {
  pending:          { label: 'New Orders',       color: '#f59e0b', bg: '#fef3c7', icon: Bell,        action: 'Accept',   nextStatus: 'accepted' },
  accepted:         { label: 'Accepted',         color: '#3b82f6', bg: '#dbeafe', icon: CheckCircle,  action: 'Start Preparing', nextStatus: 'preparing' },
  preparing:        { label: 'Preparing',        color: '#8b5cf6', bg: '#ede9fe', icon: Timer,        action: 'Mark Ready', nextStatus: 'ready_for_pickup' },
  ready_for_pickup: { label: 'Ready',            color: '#06b6d4', bg: '#cffafe', icon: Package,      action: 'Dispatch',  nextStatus: 'dispatched' },
  dispatched:       { label: 'Out for Delivery', color: '#f97316', bg: '#ffedd5', icon: Truck,        action: 'Mark Delivered', nextStatus: 'delivered' },
  delivered:        { label: 'Delivered',         color: '#22c55e', bg: '#dcfce7', icon: CheckCircle,  action: null,        nextStatus: null },
  cancelled:        { label: 'Cancelled',         color: '#ef4444', bg: '#fee2e2', icon: XCircle,      action: null,        nextStatus: null },
  return_requested: { label: 'Return Requested', color: '#f43f5e', bg: '#ffe4e6', icon: Package,      action: 'Process Return', nextStatus: 'returned' },
};

const STATUS_TABS = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'dispatched', 'delivered', 'cancelled'];

export default function OrderManagementPanel({ token, shopId }) {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});

  const fetchOrders = useCallback(async (status) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shops/my-shop/orders?status=${status}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    if (!shopId) return;
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(BACKEND_URL);

    socket.emit('join_shop_room', shopId);

    socket.on('NEW_ORDER', (data) => {
      // If we are on the pending tab or the status matches, refresh
      if (activeTab === 'pending' || activeTab === data.status) {
        fetchOrders(activeTab);
      }
    });

    socket.on('ORDER_STATUS_CHANGED', (data) => {
      fetchOrders(activeTab);
    });

    return () => {
      socket.disconnect();
    };
  }, [shopId, activeTab, fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus, prepTime) => {
    try {
      const res = await fetch(`${API_BASE}/shops/my-shop/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, preparation_time_minutes: prepTime }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove from current tab, play success sound
        setOrders(prev => prev.filter(o => o.id !== orderId));
        // Update counts
        setStatusCounts(prev => ({
          ...prev,
          [activeTab]: Math.max(0, (prev[activeTab] || 0) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1,
        }));
      }
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const handleAssignRider = async (orderId) => {
    // In a real app, this would open a modal with a list of riders.
    // For now, we mock assign nearest rider.
    const mockRiderId = 'RIDER-TEST-123';
    try {
      const res = await fetch(`${API_BASE}/shops/${shopId}/orders/${orderId}/assign-rider`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: mockRiderId })
      });
      if (res.ok) fetchOrders(activeTab);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    await handleStatusUpdate(orderId, 'cancelled');
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q)
    );
  });

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const timeSince = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ─── STATUS TABS ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px',
        background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {STATUS_TABS.map(status => {
          const config = ORDER_STATUS_CONFIG[status];
          const count = statusCounts[status] || (activeTab === status ? orders.length : 0);
          const isActive = activeTab === status;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? config.bg : 'transparent',
                color: isActive ? config.color : '#94a3b8',
                transition: 'all 0.2s ease',
              }}
            >
              <config.icon size={16} />
              {config.label}
              {count > 0 && (
                <span style={{
                  background: isActive ? config.color : '#475569',
                  color: '#fff', borderRadius: '10px', padding: '2px 8px',
                  fontSize: '11px', fontWeight: 700, minWidth: '20px', textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── SEARCH & ACTIONS ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
          padding: '10px 16px', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text" placeholder="Search by order ID, customer name, phone..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e2e8f0', fontSize: '14px', width: '100%',
            }}
          />
        </div>
        <button
          onClick={() => fetchOrders(activeTab)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* ─── ORDER CARDS ──────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <Package size={48} style={{ color: '#475569', marginBottom: '12px' }} />
          <p style={{ color: '#64748b', fontSize: '15px' }}>No {ORDER_STATUS_CONFIG[activeTab]?.label} orders</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order, idx) => {
            const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
            const isExpanded = expandedOrder === order.id;
            const items = (() => { try { return JSON.parse(order.items || '[]'); } catch { return []; } })();

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
                  border: `1px solid ${config.color}30`, overflow: 'hidden',
                }}
              >
                {/* Order Header */}
                <div
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <config.icon size={20} color={config.color} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700 }}>
                          #{order.id?.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{
                          padding: '2px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                          background: config.bg, color: config.color,
                        }}>
                          {order.order_type === 'dine_in' ? '🍽️ Dine-in' : order.delivery_type === 'delivery' ? '🚴 Delivery' : '🏃 Pickup'}
                        </span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: '2px 0 0' }}>
                        {order.customer_name || 'Walk-in'} • {timeSince(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 800 }}>
                      ₹{parseFloat(order.total_amount || 0).toFixed(0)}
                    </span>
                    {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {/* Items List */}
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                            Order Items
                          </p>
                          {items.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}>
                              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>
                                {item.quantity || 1}x {item.name || item.product_name || 'Item'}
                              </span>
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>₹{item.price || 0}</span>
                            </div>
                          ))}
                        </div>

                        {/* Special Instructions */}
                        {order.special_instructions && (
                          <div style={{
                            marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                            background: '#fef3c720', border: '1px solid #f59e0b30',
                          }}>
                            <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>📝 Special Instructions</p>
                            <p style={{ color: '#fbbf24', fontSize: '13px', marginTop: '4px' }}>{order.special_instructions}</p>
                          </div>
                        )}

                        {/* Delivery Address */}
                        {order.delivery_address && (
                          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <MapPin size={16} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ color: '#94a3b8', fontSize: '13px' }}>{order.delivery_address}</p>
                          </div>
                        )}

                        {/* Customer Contact */}
                        {order.customer_phone && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={14} style={{ color: '#22c55e' }} />
                            <a href={`tel:${order.customer_phone}`} style={{ color: '#22c55e', fontSize: '13px', textDecoration: 'none' }}>
                              {order.customer_phone}
                            </a>
                          </div>
                        )}

                        {/* Payment Info */}
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CreditCard size={14} style={{ color: '#a855f7' }} />
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {order.payment_method || 'COD'} • {order.payment_status || 'pending'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                          {config.action && (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (order.status === 'ready_for_pickup' && order.delivery_type === 'delivery') {
                                  handleAssignRider(order.id);
                                } else {
                                  handleStatusUpdate(order.id, config.nextStatus); 
                                }
                              }}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '12px', borderRadius: '12px', border: 'none',
                                background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                                color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {order.status === 'ready_for_pickup' && order.delivery_type === 'delivery' ? 'Assign Rider' : config.action} <ArrowRight size={16} />
                            </button>
                          )}
                          {order.status === 'pending' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(order.id); }}
                              style={{
                                padding: '12px 20px', borderRadius: '12px',
                                border: '1px solid #ef444450', background: 'transparent',
                                color: '#ef4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); /* open chat */ }}
                            style={{
                              padding: '12px', borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                              color: '#94a3b8', cursor: 'pointer',
                            }}
                          >
                            <MessageCircle size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
