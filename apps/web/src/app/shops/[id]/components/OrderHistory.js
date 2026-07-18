'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, CheckCircle, XCircle, RotateCcw, Star,
  ChevronDown, ChevronRight, ShoppingBag, Calendar, Filter,
  Receipt, Download
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// ORDER HISTORY — Visitor side
// Shows past orders with reorder, rate, and receipt download
// ═══════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
  delivered: { bg: '#22c55e20', text: '#22c55e', label: 'Delivered' },
  completed: { bg: '#22c55e20', text: '#22c55e', label: 'Completed' },
  cancelled: { bg: '#ef444420', text: '#ef4444', label: 'Cancelled' },
  refunded: { bg: '#f59e0b20', text: '#f59e0b', label: 'Refunded' },
  processing: { bg: '#3b82f620', text: '#3b82f6', label: 'Processing' },
  confirmed: { bg: '#3b82f620', text: '#3b82f6', label: 'Confirmed' },
  placed: { bg: '#6366f120', text: '#6366f1', label: 'Placed' },
};

export default function OrderHistory({ shopId, onReorder, onTrackOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [ratingOrder, setRatingOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [shopId]);

  async function fetchOrders() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/shops/${shopId}/orders/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function submitRating() {
    if (!ratingOrder || rating === 0) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/shops/${shopId}/orders/${ratingOrder}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, review }),
      });
      setRatingOrder(null);
      setRating(0);
      setReview('');
      fetchOrders();
    } catch (err) {
      console.error('Rating failed:', err);
    }
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-background-alt p-5 rounded-2xl border border-border animate-pulse">
            <div className="h-4 bg-border rounded w-1/3 mb-3" />
            <div className="h-3 bg-border rounded w-2/3 mb-2" />
            <div className="h-3 bg-border rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" /> Order History
        </h2>
        <div className="flex gap-2">
          {['all', 'delivered', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filter === f ? 'bg-primary text-white border-primary' : 'bg-transparent border-border text-text-muted hover:border-primary/30'
              }`}>
              {f === 'all' ? 'All' : STATUS_COLORS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-background-alt rounded-2xl border border-border">
          <ShoppingBag className="w-12 h-12 mx-auto text-text-muted mb-3" />
          <p className="text-text-muted font-medium">No orders yet</p>
          <p className="text-text-muted text-sm mt-1">Your order history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, i) => {
            const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.placed;
            const isExpanded = expandedOrder === order.id;
            const isActive = ['placed', 'confirmed', 'processing'].includes(order.status);

            return (
              <motion.div
                key={order.id || i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-background-alt rounded-2xl border border-border overflow-hidden"
              >
                {/* Order Summary Row */}
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-text text-sm truncate">Order #{(order.id || '').toString().slice(-6)}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {' • '}
                      {order.items_count || '—'} items
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-text">₹{order.total_amount || '—'}</p>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted mt-1 ml-auto" /> : <ChevronRight className="w-4 h-4 text-text-muted mt-1 ml-auto" />}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      {/* Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="px-4 py-3">
                          {order.items.map((item, j) => (
                            <div key={j} className="flex justify-between text-sm py-1.5">
                              <span className="text-text-muted">{item.quantity}x {item.name}</span>
                              <span className="text-text font-medium">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold pt-2 border-t border-border mt-2">
                            <span className="text-text">Total</span>
                            <span className="text-primary">₹{order.total_amount}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="px-4 pb-4 flex gap-2 flex-wrap">
                        {isActive && (
                          <button onClick={() => onTrackOrder?.(order)} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold">
                            <Clock className="w-3 h-3" /> Track Order
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <>
                            <button onClick={() => onReorder?.(order)} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-bold">
                              <RotateCcw className="w-3 h-3" /> Reorder
                            </button>
                            {!order.rating && (
                              <button onClick={() => { setRatingOrder(order.id); setRating(0); setReview(''); }} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold">
                                <Star className="w-3 h-3" /> Rate
                              </button>
                            )}
                          </>
                        )}
                        <button className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border text-text-muted text-xs font-bold hover:bg-border/30">
                          <Download className="w-3 h-3" /> Receipt
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingOrder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setRatingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-2xl p-6 w-full max-w-sm border border-border"
            >
              <h3 className="text-lg font-bold text-text mb-4">⭐ Rate Your Order</h3>
              <div className="flex gap-2 justify-center mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star className={`w-8 h-8 transition-colors ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-border'}`} />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Write a review (optional)..."
                value={review}
                onChange={e => setReview(e.target.value)}
                className="w-full p-3 rounded-xl border border-border bg-background-alt text-text text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setRatingOrder(null)} className="flex-1 py-2 rounded-xl border border-border text-text-muted font-bold text-sm">Cancel</button>
                <button onClick={submitRating} disabled={rating === 0} className="flex-1 py-2 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50">Submit</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
