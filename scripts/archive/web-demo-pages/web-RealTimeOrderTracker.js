'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Truck, CheckCircle, Clock, MapPin, Phone,
  ChevronDown, ChevronUp, RefreshCw, Star, X
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// REAL-TIME ORDER TRACKER — Visitor side
// Shows live order status with visual pipeline + ETA
// ═══════════════════════════════════════════════════════════════════════

const ORDER_STAGES = {
  product: [
    { key: 'placed', label: 'Order Placed', icon: Package, emoji: '📦' },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, emoji: '✅' },
    { key: 'preparing', label: 'Preparing', icon: Clock, emoji: '👨‍🍳' },
    { key: 'ready', label: 'Ready', icon: Package, emoji: '📤' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, emoji: '🚴' },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle, emoji: '🎉' },
  ],
  appointment: [
    { key: 'requested', label: 'Requested', icon: Clock, emoji: '📋' },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, emoji: '✅' },
    { key: 'in_progress', label: 'In Progress', icon: Clock, emoji: '⏳' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, emoji: '🎉' },
  ],
  job_card: [
    { key: 'received', label: 'Received', icon: Package, emoji: '📥' },
    { key: 'inspecting', label: 'Inspecting', icon: Clock, emoji: '🔍' },
    { key: 'estimate_sent', label: 'Estimate Sent', icon: Package, emoji: '💰' },
    { key: 'approved', label: 'Approved', icon: CheckCircle, emoji: '✅' },
    { key: 'in_repair', label: 'In Repair', icon: Clock, emoji: '🔧' },
    { key: 'quality_check', label: 'QC', icon: CheckCircle, emoji: '🔬' },
    { key: 'ready', label: 'Ready for Pickup', icon: Package, emoji: '🎉' },
  ],
};

export default function RealTimeOrderTracker({ orderId, orderType = 'product', onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const stages = ORDER_STAGES[orderType] || ORDER_STAGES.product;

  useEffect(() => {
    fetchOrder();
    // Poll every 15 seconds for real-time updates
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [orderId]);

  async function fetchOrder() {
    try {
      const token = localStorage.getItem('token');
      const endpoint = orderType === 'appointment' ? 'appointments' : 'orders';
      const res = await fetch(`${API_BASE}/shops/my/${endpoint}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  }

  const currentStageIndex = order ? stages.findIndex(s => s.key === order.status) : 0;
  const progress = stages.length > 1 ? Math.max(0, (currentStageIndex / (stages.length - 1)) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-background-alt p-6 rounded-2xl border border-border animate-pulse">
        <div className="h-4 bg-border rounded w-1/3 mb-4" />
        <div className="h-8 bg-border rounded w-full mb-4" />
        <div className="h-4 bg-border rounded w-2/3" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-background-alt rounded-2xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-text text-sm">Order #{orderId?.slice(-6) || '—'}</p>
            <p className="text-xs text-text-muted">
              {stages[currentStageIndex]?.emoji} {stages[currentStageIndex]?.label || 'Processing'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); fetchOrder(); }} className="p-2 rounded-lg hover:bg-border/50 transition-colors">
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </button>
          {onClose && (
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-lg hover:bg-border/50">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Progress Bar */}
            <div className="px-5 mb-4">
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-green-500"
                />
              </div>
            </div>

            {/* Stage Pipeline */}
            <div className="px-5 pb-6">
              <div className="flex justify-between relative">
                {stages.map((stage, i) => {
                  const isCompleted = i <= currentStageIndex;
                  const isCurrent = i === currentStageIndex;
                  return (
                    <div key={stage.key} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
                      <motion.div
                        initial={false}
                        animate={{ scale: isCurrent ? 1.15 : 1 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2 border-2 transition-colors ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-background border-border text-text-muted'
                        } ${isCurrent ? 'ring-4 ring-green-500/20' : ''}`}
                      >
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                      </motion.div>
                      <p className={`text-[10px] font-bold text-center leading-tight ${
                        isCompleted ? 'text-green-500' : 'text-text-muted'
                      }`}>
                        {stage.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ETA & Details */}
            <div className="px-5 pb-5 border-t border-border pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold">ETA</p>
                    <p className="text-sm font-bold text-text">{order?.eta || '~30 min'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-text-muted" />
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold">Delivery</p>
                    <p className="text-sm font-bold text-text">{order?.delivery_type || 'Pickup'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-text-muted" />
                  <div>
                    <p className="text-[10px] text-text-muted uppercase font-bold">Support</p>
                    <p className="text-sm font-bold text-primary cursor-pointer">Contact Shop</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
