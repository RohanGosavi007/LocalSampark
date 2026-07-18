'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed, ChefHat, Timer, Bell, Package, Truck, CheckCircle,
  XCircle, Clock, Users, QrCode, Plus, Minus, Search, RefreshCw,
  LayoutGrid, List, AlertTriangle, Flame, Star, Phone, MapPin,
  ArrowRight, ChevronDown, ChevronUp, Volume2, Eye, Calendar,
  TrendingUp, DollarSign, ShoppingBag, Coffee, Sparkles
} from 'lucide-react';
import OrderManagementPanel from './shared/OrderManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// ADVANCED RESTAURANT MANAGER — Better than Swiggy/Zomato
// Features: KDS, Table Mgmt, Dine-in QR, Daily Specials, Live Dashboard
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'kds', label: 'Kitchen (KDS)', icon: ChefHat },
  { id: 'tables', label: 'Tables', icon: Users },
  { id: 'menu', label: 'Menu', icon: Coffee },
  { id: 'reservations', label: 'Reservations', icon: Calendar },
  { id: 'specials', label: 'Daily Specials', icon: Sparkles },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

export default function AdvancedRestaurantManager({ token, shopId, shop }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ─── SECTION NAVIGATION ──────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {SECTION_TABS.map(tab => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── SECTION CONTENT ─────────────────────────────────── */}
      {activeSection === 'dashboard' && <RestaurantDashboard token={token} />}
      {activeSection === 'orders' && <OrderManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'kds' && <KitchenDisplaySystem token={token} shopId={shopId} />}
      {activeSection === 'tables' && <TableManagement token={token} shopId={shopId} />}
      {activeSection === 'menu' && <MenuManager token={token} shopId={shopId} />}
      {activeSection === 'reservations' && <ReservationManager token={token} shopId={shopId} />}
      {activeSection === 'specials' && <DailySpecialsManager token={token} shopId={shopId} />}
      {activeSection === 'analytics' && <RestaurantAnalytics token={token} shopId={shopId} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESTAURANT DASHBOARD — Live Overview
// ═══════════════════════════════════════════════════════════════════════
function RestaurantDashboard({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/shops/my-shop/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (err) { console.error(err); }
    })();
  }, [token]);

  const statCards = [
    { label: "Today's Orders", value: stats?.ordersToday || 0, icon: ShoppingBag, color: '#f97316', bg: '#f9731620' },
    { label: "Pending Orders", value: stats?.ordersPending || 0, icon: Bell, color: '#f59e0b', bg: '#f59e0b20', pulse: true },
    { label: "Today's Revenue", value: `₹${stats?.revenueToday || 0}`, icon: DollarSign, color: '#22c55e', bg: '#22c55e20' },
    { label: "Total Revenue", value: `₹${stats?.revenueTotal || 0}`, icon: TrendingUp, color: '#6366f1', bg: '#6366f120' },
    { label: "Active Staff", value: stats?.staffCount || 0, icon: Users, color: '#06b6d4', bg: '#06b6d420' },
    { label: "Avg Rating", value: `⭐ ${stats?.avgRating || '0.0'}`, icon: Star, color: '#eab308', bg: '#eab30820' },
    { label: "Menu Items", value: stats?.productsCount || 0, icon: Coffee, color: '#a855f7', bg: '#a855f720' },
    { label: "Open Disputes", value: stats?.disputesOpen || 0, icon: AlertTriangle, color: '#ef4444', bg: '#ef444420' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
        🍽️ Restaurant Dashboard — Live
      </h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{
              padding: '18px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${card.color}25`,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {card.pulse && parseInt(card.value) > 0 && (
              <div style={{
                position: 'absolute', top: '8px', right: '8px', width: '10px', height: '10px',
                borderRadius: '50%', background: card.color, animation: 'pulse 1.5s infinite',
              }} />
            )}
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', background: card.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
            }}>
              <card.icon size={20} color={card.color} />
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>
              {card.label}
            </p>
            <p style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: 800, margin: '4px 0 0' }}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// KDS — KITCHEN DISPLAY SYSTEM
// ═══════════════════════════════════════════════════════════════════════
function KitchenDisplaySystem({ token, shopId }) {
  const [tickets, setTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const audioRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    try {
      const statusParam = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const res = await fetch(`${API_BASE}/shops/my-shop/kds${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTickets(data.tickets || []);
    } catch (err) { console.error(err); }
  }, [token, filterStatus]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const updateTicket = async (ticketId, status) => {
    try {
      await fetch(`${API_BASE}/shops/my-shop/kds/${ticketId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchTickets();
    } catch (err) { console.error(err); }
  };

  const KDS_COLUMNS = [
    { status: 'new', label: '🔴 NEW', color: '#ef4444', bgBorder: '#ef444430' },
    { status: 'preparing', label: '🟡 PREPARING', color: '#f59e0b', bgBorder: '#f59e0b30' },
    { status: 'ready', label: '🟢 READY', color: '#22c55e', bgBorder: '#22c55e30' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>
          👨‍🍳 Kitchen Display System
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchTickets}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KDS Kanban Board */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
        minHeight: '400px',
      }}>
        {KDS_COLUMNS.map(col => {
          const colTickets = tickets.filter(t => t.status === col.status);
          return (
            <div key={col.status} style={{
              borderRadius: '16px', border: `2px solid ${col.bgBorder}`,
              background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
            }}>
              {/* Column Header */}
              <div style={{
                padding: '14px 18px', borderBottom: `2px solid ${col.bgBorder}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: col.color, fontSize: '15px', fontWeight: 800 }}>
                  {col.label}
                </span>
                <span style={{
                  background: col.color, color: '#fff', borderRadius: '10px',
                  padding: '2px 10px', fontSize: '13px', fontWeight: 700,
                }}>
                  {colTickets.length}
                </span>
              </div>

              {/* Tickets */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AnimatePresence>
                  {colTickets.map((ticket, idx) => {
                    const items = (() => { try { return JSON.parse(ticket.items || '[]'); } catch { return []; } })();
                    const elapsed = ticket.prep_started_at
                      ? Math.floor((Date.now() - new Date(ticket.prep_started_at).getTime()) / 60000)
                      : 0;
                    const isOverdue = elapsed > (ticket.estimated_prep_minutes || 15);

                    return (
                      <motion.div
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={{
                          padding: '14px', borderRadius: '12px',
                          background: isOverdue ? '#ef444415' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isOverdue ? '#ef444450' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {/* Ticket Number */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{
                            background: col.color, color: '#fff', borderRadius: '8px',
                            padding: '4px 12px', fontSize: '16px', fontWeight: 900,
                          }}>
                            #{ticket.ticket_number}
                          </span>
                          {ticket.priority === 'rush' && (
                            <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>🔥 RUSH</span>
                          )}
                          {ticket.priority === 'vip' && (
                            <span style={{ color: '#eab308', fontSize: '12px', fontWeight: 700 }}>⭐ VIP</span>
                          )}
                        </div>

                        {/* Timer */}
                        {col.status === 'preparing' && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            marginBottom: '8px', color: isOverdue ? '#ef4444' : '#94a3b8', fontSize: '12px',
                          }}>
                            <Timer size={14} />
                            <span style={{ fontWeight: 700 }}>
                              {elapsed}m / {ticket.estimated_prep_minutes || 15}m
                            </span>
                            {isOverdue && <span style={{ color: '#ef4444', fontWeight: 700 }}>OVERDUE!</span>}
                          </div>
                        )}

                        {/* Items */}
                        {items.map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '4px 0', fontSize: '13px',
                          }}>
                            <span style={{ color: '#cbd5e1' }}>
                              {item.quantity || 1}× {item.name || 'Item'}
                            </span>
                          </div>
                        ))}

                        {/* Special Instructions */}
                        {ticket.special_instructions && (
                          <div style={{
                            marginTop: '8px', padding: '8px 10px', borderRadius: '8px',
                            background: '#f59e0b15', border: '1px solid #f59e0b30',
                          }}>
                            <p style={{ color: '#fbbf24', fontSize: '11px', margin: 0 }}>📝 {ticket.special_instructions}</p>
                          </div>
                        )}

                        {/* Action */}
                        <button
                          onClick={() => {
                            const nextStatus = col.status === 'new' ? 'preparing' : col.status === 'preparing' ? 'ready' : 'served';
                            updateTicket(ticket.id, nextStatus);
                          }}
                          style={{
                            width: '100%', marginTop: '10px', padding: '10px',
                            borderRadius: '10px', border: 'none',
                            background: `linear-gradient(135deg, ${col.color}, ${col.color}cc)`,
                            color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {col.status === 'new' ? '▶ Start Preparing' : col.status === 'preparing' ? '✅ Mark Ready' : '🍽️ Served'}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TABLE MANAGEMENT — Live Floor Plan
// ═══════════════════════════════════════════════════════════════════════
function TableManagement({ token, shopId }) {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/shops/my-shop/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setTables(data.tables || []);
      } catch (err) { console.error(err); }
    })();
  }, [token]);

  const updateTable = async (tableId, status, orderId) => {
    try {
      await fetch(`${API_BASE}/shops/my-shop/tables/${tableId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, currentOrderId: orderId }),
      });
      // Refresh
      const res = await fetch(`${API_BASE}/shops/my-shop/tables`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTables(data.tables || []);
    } catch (err) { console.error(err); }
  };

  const TABLE_COLORS = {
    available: { bg: '#22c55e20', border: '#22c55e50', text: '#22c55e', label: 'Available' },
    occupied:  { bg: '#ef444420', border: '#ef444450', text: '#ef4444', label: 'Occupied' },
    reserved:  { bg: '#f59e0b20', border: '#f59e0b50', text: '#f59e0b', label: 'Reserved' },
    cleaning:  { bg: '#6366f120', border: '#6366f150', text: '#6366f1', label: 'Cleaning' },
  };

  const summary = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    total: tables.length,
  };

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
        🪑 Table Management
      </h2>

      {/* Summary Bar */}
      <div style={{
        display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap',
      }}>
        {Object.entries(TABLE_COLORS).map(([status, config]) => (
          <div key={status} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '10px', background: config.bg, border: `1px solid ${config.border}`,
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: config.text }} />
            <span style={{ color: config.text, fontSize: '13px', fontWeight: 600 }}>
              {config.label}: {tables.filter(t => t.status === status).length}
            </span>
          </div>
        ))}
      </div>

      {/* Table Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        {tables.map((table) => {
          const config = TABLE_COLORS[table.status] || TABLE_COLORS.available;
          const timeSinceOccupied = table.occupied_at
            ? Math.floor((Date.now() - new Date(table.occupied_at).getTime()) / 60000) : 0;

          return (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.05 }}
              style={{
                padding: '20px', borderRadius: '16px', textAlign: 'center',
                background: config.bg, border: `2px solid ${config.border}`,
                cursor: 'pointer', position: 'relative',
              }}
              onClick={() => {
                if (table.status === 'available') updateTable(table.id, 'occupied');
                else if (table.status === 'occupied') {
                  if (confirm('Free this table?')) updateTable(table.id, 'cleaning');
                }
                else if (table.status === 'cleaning') updateTable(table.id, 'available');
              }}
            >
              <p style={{ color: config.text, fontSize: '24px', fontWeight: 900, margin: 0 }}>
                T{table.table_number}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0' }}>
                {table.capacity} seats • {table.section || 'Main'}
              </p>
              <p style={{
                color: config.text, fontSize: '11px', fontWeight: 700, margin: '6px 0 0',
                textTransform: 'uppercase',
              }}>
                {config.label}
              </p>
              {table.status === 'occupied' && timeSinceOccupied > 0 && (
                <p style={{ color: '#94a3b8', fontSize: '10px', margin: '2px 0 0' }}>
                  {timeSinceOccupied}m elapsed
                </p>
              )}
            </motion.div>
          );
        })}

        {/* Add Table Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            padding: '20px', borderRadius: '16px', textAlign: 'center',
            border: '2px dashed rgba(255,255,255,0.15)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={24} color="#64748b" />
          <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0' }}>Add Table</p>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MENU MANAGER — Products with dietary tags, customizations
// ═══════════════════════════════════════════════════════════════════════
function MenuManager({ token, shopId }) {
  return (
    <div style={{
      padding: '40px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Coffee size={48} style={{ color: '#f97316', marginBottom: '12px' }} />
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700 }}>Menu Manager</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>
        Add products with dietary tags (Veg 🟢 / Non-Veg 🔴 / Jain / Vegan), customizations (spice level, extras), photos, and preparation time.
      </p>
      <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
        Use the Products tab in your main dashboard to manage your menu items.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RESERVATION MANAGER
// ═══════════════════════════════════════════════════════════════════════
function ReservationManager({ token, shopId }) {
  return (
    <div style={{
      padding: '40px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Calendar size={48} style={{ color: '#6366f1', marginBottom: '12px' }} />
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700 }}>Table Reservations</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>
        Manage upcoming reservations. Customers can book tables with party size and special requests.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DAILY SPECIALS
// ═══════════════════════════════════════════════════════════════════════
function DailySpecialsManager({ token, shopId }) {
  return (
    <div style={{
      padding: '40px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Sparkles size={48} style={{ color: '#f59e0b', marginBottom: '12px' }} />
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700 }}>Daily Specials</h3>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>
        Create limited-time specials with discounted prices and max quantity. Customers see these with a 🔥 badge.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════
function RestaurantAnalytics({ token, shopId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/shops/my-shop/analytics?period=30d`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setAnalytics(data.analytics);
      } catch (err) { console.error(err); }
    })();
  }, [token]);

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
        📊 Restaurant Analytics (30 Days)
      </h2>

      {analytics ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Revenue Chart */}
          <div style={{
            padding: '20px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Revenue by Day</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
              {(analytics.revenueByDay || []).slice(-14).map((day, i) => {
                const maxRevenue = Math.max(...(analytics.revenueByDay || []).map(d => d.revenue || 0), 1);
                const height = ((day.revenue || 0) / maxRevenue) * 100;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%', height: `${height}%`, minHeight: '4px',
                      borderRadius: '4px 4px 0 0',
                      background: 'linear-gradient(180deg, #f97316, #ea580c)',
                    }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Items */}
          <div style={{
            padding: '20px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Top Selling Items</h3>
            {(analytics.topProducts || []).slice(0, 5).map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '8px',
                    background: '#f9731620', color: '#f97316',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{item.name}</span>
                </div>
                <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>₹{item.revenue || 0}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading analytics...</p>
        </div>
      )}
    </div>
  );
}
