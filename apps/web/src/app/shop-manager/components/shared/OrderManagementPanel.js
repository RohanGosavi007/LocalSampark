'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Eye, Phone,
  ChevronDown, ChevronUp, Filter, Search, RefreshCw, Bell,
  MapPin, CreditCard, MessageCircle, ArrowRight, Timer
} from 'lucide-react';

import { API_BASE } from '@/lib/api';
import { getSharedSocket } from '@/context/SocketContext';

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

// S3: the API stores pipeline names (confirmed, ready, out_for_delivery) and
// only renames the last for the board. This table is keyed on the board's own
// names (accepted, ready_for_pickup), so an accepted or ready order found no
// entry, fell back to the "New Orders" config, and showed "Accept" again — the
// seller could not move it on.
const BOARD_KEY = { confirmed: 'accepted', ready: 'ready_for_pickup', out_for_delivery: 'dispatched', completed: 'delivered' };
const boardKey = (status) => BOARD_KEY[String(status || '').toLowerCase()] || String(status || '').toLowerCase();
const UNKNOWN_CONFIG = (status) => ({ label: String(status || 'Unknown'), color: '#64748b', bg: '#f1f5f9', icon: Package, action: null, nextStatus: null });

/**
 * What the shop can do next, following the order pipeline's own rules
 * (orderLifecycle): a pickup order is handed over from "ready" (it is never
 * "out for delivery"); once a rider has taken a delivery the rider moves it
 * and the shop cannot; otherwise the shop is delivering it itself.
 */
function actionFor(order, status, config) {
  const pickup = String(order.fulfillment_method || '').toLowerCase() === 'pickup';
  const hasRider = Boolean(order.assigned_agent_id);
  if (status === 'ready_for_pickup') {
    if (pickup) return { label: 'Mark Handed Over', next: 'delivered' };
    if (hasRider) return { note: 'A delivery partner is handling this order.' };
    return { label: 'Out for Delivery (own delivery)', next: 'dispatched', note: 'Delivery partners nearby can also pick this up.' };
  }
  if (status === 'dispatched') {
    if (hasRider) return { note: 'A delivery partner is delivering this order.' };
    return { label: 'Mark Delivered', next: 'delivered' };
  }
  return config.action ? { label: config.action, next: config.nextStatus } : null;
}

export default function OrderManagementPanel({ token, shopId }) {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [actionError, setActionError] = useState('');
  const [slip, setSlip] = useState(null); // { orderId, text }
  const [statusCounts, setStatusCounts] = useState({});

  // `silent` refreshes (a live update from the socket) keep the list on screen.
  // Every refresh used to set loading, which replaced the whole list with the
  // loading state and rebuilt every card: the order a seller was in the middle
  // of handling collapsed and its button vanished under their finger.
  // Each load and each live update is its own request, and responses can
  // arrive out of order. A response may touch the screen only if it is for the
  // tab the seller is on NOW and is the latest request for that tab. (A live
  // update fired from the previous tab's socket handler just as the seller
  // switched used to replace the new tab's list with the old tab's orders.)
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const requestCounter = useRef(0);
  const latestForTab = useRef({});

  const fetchOrders = useCallback(async (status, { silent = false } = {}) => {
    const mine = ++requestCounter.current;
    latestForTab.current[status] = mine;
    const current = () => activeTabRef.current === status && latestForTab.current[status] === mine;
    try {
      if (!silent) { setLoading(true); setActionError(''); }
      const res = await fetch(`${API_BASE}/shops/my-shop/orders?status=${status}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!current()) return; // superseded, or for a tab the seller has left
      if (data.success) {
        setOrders(data.orders || []);
      } else if (!silent) {
        setActionError(data.error || 'Your orders could not be loaded.');
      }
    } catch (err) {
      if (!silent && current()) setActionError('Your orders could not be loaded. Check your connection and try again.');
    } finally {
      // The request the screen is waiting for ends the loading state.
      if (current()) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    if (!shopId) return;
    // Shared, authenticated connection; join_shop_room is authorised
    // server-side and an anonymous socket would be refused.
    const socket = getSharedSocket();
    if (!socket) return undefined;

    socket.emit('join_shop_room', shopId);

    socket.on('NEW_ORDER', (data) => {
      // If we are on the pending tab or the status matches, refresh
      if (activeTab === 'pending' || activeTab === data.status) {
        fetchOrders(activeTab, { silent: true });
      }
    });

    socket.on('ORDER_STATUS_CHANGED', () => {
      fetchOrders(activeTab, { silent: true });
    });

    return () => {
      socket.off('NEW_ORDER');
      socket.off('ORDER_STATUS_CHANGED');
    };
  }, [shopId, activeTab, fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus, prepTime) => {
    // S3: a refused change (a skipped step, an order a rider has taken) used to
    // do nothing and say nothing. The server's reason is shown now.
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/shops/my-shop/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, preparation_time_minutes: prepTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setStatusCounts(prev => ({
          ...prev,
          [activeTab]: Math.max(0, (prev[activeTab] || 0) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1,
        }));
      } else {
        setActionError(data.error || 'That change could not be made.');
      }
    } catch (err) {
      setActionError('That change could not be made. Check your connection and try again.');
    }
  };

  // The packing slip is plain text for an 80 mm thermal printer
  // (GET /orders/:id/packing-slip); it needs the session, so it is fetched
  // and shown here rather than opened as a link.
  const showPackingSlip = async (orderId) => {
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/packing-slip`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'The packing slip could not be loaded.');
        return;
      }
      setSlip({ orderId, text: await res.text() });
    } catch (err) {
      setActionError('The packing slip could not be loaded. Check your connection.');
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
      {actionError && <p role="alert" style={{ color: '#ef4444', fontSize: '14px' }}>{actionError}</p>}
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
            const status = boardKey(order.status);
            const config = ORDER_STATUS_CONFIG[status] || UNKNOWN_CONFIG(order.status);
            const action = actionFor(order, status, config);
            const isExpanded = expandedOrder === order.id;
            const items = (() => { try { return JSON.parse(order.items || '[]'); } catch { return []; } })();

            return (
              <motion.div
                key={order.id}
                data-testid={`order-${order.id}`}
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
                          {/* orders carry fulfillment_method, not delivery_type: every order read "Pickup" */}
                          {order.order_type === 'dine_in' ? '🍽️ Dine-in' : String(order.fulfillment_method || '').toLowerCase() === 'pickup' ? '🏃 Pickup' : '🚴 Delivery'}
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
                          {action && action.next && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, action.next); }}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '12px', borderRadius: '12px', border: 'none',
                                background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                                color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              {action.label} <ArrowRight size={16} />
                            </button>
                          )}
                          {action && action.note && (
                            <p style={{ flex: 1, color: '#94a3b8', fontSize: '13px', alignSelf: 'center' }}>{action.note}</p>
                          )}
                          {['confirmed', 'accepted', 'preparing', 'ready_for_pickup'].includes(status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); showPackingSlip(order.id); }}
                              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#cbd5e1', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Packing slip
                            </button>
                          )}
                          {status === 'pending' && (
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
                        {/* Under this order's own buttons: nothing the seller is about to
                            click moves when the slip opens. */}
                        {slip && slip.orderId === order.id && (
                          <div style={{ marginTop: '12px', background: '#fff', color: '#0f172a', borderRadius: '12px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                            <pre data-testid="packing-slip" style={{ fontFamily: 'monospace', fontSize: '12px', margin: 0, overflowX: 'auto' }}>{slip.text}</pre>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: '8px', background: '#0f172a', color: '#fff', fontWeight: 600 }}>Print</button>
                              <button onClick={() => setSlip(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Close</button>
                            </div>
                          </div>
                        )}
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
