'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Clock, Check, Truck, Package, X, Bell, ChevronRight,
  Printer, Timer, UserCheck, Phone
} from 'lucide-react';

/**
 * OrderKanban — Drag-and-drop order pipeline for merchant dashboards
 * Columns: Incoming → In Preparation → Ready → Completed
 * With audio chime, quick actions, and real-time Socket.io updates
 */

const STAGES = [
  { id: 'incoming', label: '🔴 Incoming', color: 'bg-red-500', textColor: 'text-red-600', lightBg: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800' },
  { id: 'in_preparation', label: '🟡 Preparing', color: 'bg-yellow-500', textColor: 'text-yellow-600', lightBg: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'ready', label: '🟢 Ready', color: 'bg-green-500', textColor: 'text-green-600', lightBg: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' },
  { id: 'completed', label: '🔵 Completed', color: 'bg-blue-500', textColor: 'text-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800' },
];

export default function OrderKanban({ orders = [], onStageChange, onAccept, onReject, socket, shopId }) {
  const [localOrders, setLocalOrders] = useState(orders);
  const audioRef = useRef(null);

  useEffect(() => { setLocalOrders(orders); }, [orders]);

  // Socket.io: Listen for new orders
  useEffect(() => {
    if (!socket || !shopId) return;

    const handleNewOrder = (data) => {
      setLocalOrders(prev => [{ ...data, stage: 'incoming', isNew: true }, ...prev]);
      playChime();
    };

    const handleStatusChange = (data) => {
      setLocalOrders(prev =>
        prev.map(o => o.id === data.orderId ? { ...o, stage: data.stage } : o)
      );
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_changed', handleStatusChange);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_changed', handleStatusChange);
    };
  }, [socket, shopId]);

  const playChime = () => {
    try {
      // Web Audio API chime
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio chime not supported');
    }
  };

  const moveOrder = (orderId, newStage) => {
    setLocalOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, stage: newStage, isNew: false } : o)
    );
    onStageChange?.(orderId, newStage);
  };

  const getOrdersByStage = (stageId) => localOrders.filter(o => o.stage === stageId);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.round((now - date) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  return (
    <div className="w-full">
      {/* Stats Header */}
      <div className="flex flex-wrap gap-3 mb-6">
        {STAGES.slice(0, 3).map(stage => {
          const count = getOrdersByStage(stage.id).length;
          return (
            <div key={stage.id} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${stage.borderColor} ${stage.lightBg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${stage.color} ${stage.id === 'incoming' && count > 0 ? 'animate-pulse' : ''}`} />
              <span className={`text-sm font-bold ${stage.textColor}`}>{stage.label.split(' ')[1]}</span>
              <span className={`text-sm font-black ${stage.textColor}`}>({count})</span>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map(stage => (
          <div key={stage.id} className="flex flex-col">
            {/* Column Header */}
            <div className={`flex items-center justify-between p-3 rounded-t-2xl border-b-2 ${stage.lightBg} ${stage.borderColor}`}>
              <h3 className={`text-sm font-heading font-bold ${stage.textColor}`}>{stage.label}</h3>
              <span className={`w-7 h-7 rounded-full ${stage.color} text-white text-xs font-bold flex items-center justify-center`}>
                {getOrdersByStage(stage.id).length}
              </span>
            </div>

            {/* Orders */}
            <div className={`flex-1 min-h-[200px] p-2 rounded-b-2xl border ${stage.borderColor} bg-background-alt/50 space-y-2 overflow-y-auto max-h-[60vh]`}>
              <AnimatePresence>
                {getOrdersByStage(stage.id).map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-3 rounded-xl border bg-card-bg hover:shadow-md transition-all ${
                      order.isNew ? 'ring-2 ring-red-500 ring-offset-1 animate-pulse' : 'border-border'
                    }`}
                  >
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-heading font-bold text-text text-sm">#{order.order_number || order.id}</p>
                        <p className="text-xs text-text-muted">{order.customer_name || 'Customer'}</p>
                      </div>
                      <span className="text-[10px] text-text-muted font-medium">{formatTime(order.created_at || order.timestamp)}</span>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-1 mb-3">
                      {(order.items || []).slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-text-muted">{item.quantity}x {item.name}</span>
                          <span className="font-semibold text-text">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      {(order.items || []).length > 3 && (
                        <p className="text-xs text-text-muted italic">+{order.items.length - 3} more items</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center py-2 border-t border-border mb-2">
                      <span className="text-xs font-bold text-text-muted">Total</span>
                      <span className="font-heading font-black text-text">₹{order.total || order.amount || '—'}</span>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1.5 flex-wrap">
                      {stage.id === 'incoming' && (
                        <>
                          <button
                            onClick={() => { moveOrder(order.id, 'in_preparation'); onAccept?.(order.id, 15); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Accept
                          </button>
                          <button
                            onClick={() => { moveOrder(order.id, 'completed'); onReject?.(order.id); }}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-colors dark:bg-red-900/30"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {stage.id === 'in_preparation' && (
                        <button
                          onClick={() => moveOrder(order.id, 'ready')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Mark Ready
                        </button>
                      )}
                      {stage.id === 'ready' && (
                        <>
                          <button
                            onClick={() => moveOrder(order.id, 'completed')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
                          >
                            <UserCheck className="w-3 h-3" /> Picked Up
                          </button>
                          <button className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-background border border-border text-text-muted text-xs font-bold hover:bg-background-alt transition-colors">
                            <Phone className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {stage.id === 'completed' && (
                        <button className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-background border border-border text-text-muted text-xs font-bold hover:bg-background-alt transition-colors">
                          <Printer className="w-3 h-3" /> Print
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}

                {getOrdersByStage(stage.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                    <Package className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-medium">No orders</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
