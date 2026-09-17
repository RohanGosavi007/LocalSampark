'use client';

import React, { useState, useEffect, useCallback } from 'react';
import OrderKanban from '@/components/ui/OrderKanban';
import { Utensils, Flame, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api';

/**
 * Kitchen Display System.
 *
 * This screen used to be a mockup wearing a dashboard's clothes: three
 * hardcoded tickets — "2x Margherita Pizza", "1x Veg Burger (No Mayo)",
 * "3x Garlic Bread" — with no API call anywhere in the file, and a
 * handleStatusChange that only moved a card in local React state. A restaurant
 * opening it saw the same three phantom orders forever, never saw a real one,
 * and dragging a ticket to "Ready" told nobody: not the server, not the
 * customer waiting for the food.
 *
 * It also accepted a `socket` prop and ignored it, so the live updates the
 * dashboard was wiring in never arrived either.
 *
 * `GET/PUT /shops/my-shop/kds` existed the whole time.
 */

const COLUMNS = [
  { id: 'new', title: 'New Orders', color: '#3b82f6' },
  { id: 'prep', title: 'Preparing', color: '#f59e0b' },
  { id: 'ready', title: 'Ready / Dispatch', color: '#10b981' },
];

/**
 * The kitchen's three columns against the ticket statuses the API stores.
 *
 * kds_tickets.status carries the fuller vocabulary the back of house uses;
 * the board shows three lanes. Anything unrecognised lands in "new" rather
 * than vanishing — a ticket that is not displayed is a meal nobody cooks.
 */
const STATUS_TO_COLUMN = {
  pending: 'new',
  new: 'new',
  queued: 'new',
  preparing: 'prep',
  prep: 'prep',
  in_progress: 'prep',
  ready: 'ready',
  served: 'ready',
  completed: 'ready',
};

const COLUMN_TO_STATUS = { new: 'pending', prep: 'preparing', ready: 'ready' };

/** Ticket items are stored as JSON; a malformed row must not blank the board. */
function describeItems(raw) {
  if (!raw) return 'No items listed';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return describeItems(parsed);
    } catch {
      return raw;
    }
  }
  if (Array.isArray(raw)) {
    return raw
      .map((i) => `${i.quantity || i.qty || 1}x ${i.name || i.title || 'Item'}`)
      .join(', ') || 'No items listed';
  }
  if (typeof raw === 'object') return raw.name || 'No items listed';
  return String(raw);
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FoodKDS({ socket }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toCard = useCallback((ticket) => ({
    id: String(ticket.id),
    status: STATUS_TO_COLUMN[String(ticket.status || '').toLowerCase()] || 'new',
    content: describeItems(ticket.items),
    instructions: ticket.special_instructions || '',
    ticketNumber: ticket.ticket_number,
    time: formatTime(ticket.created_at),
    isUrgent: String(ticket.priority || '').toLowerCase() === 'high'
      || String(ticket.priority || '').toLowerCase() === 'urgent',
  }), []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await apiGet('/shops/my-shop/kds');
      const tickets = response?.tickets || response?.data || [];
      setOrders(tickets.map(toCard));
    } catch (err) {
      // Surfaced rather than swallowed. A kitchen staring at an empty board
      // needs to know whether there are no orders or no connection.
      setError(err?.message || 'Could not load the kitchen queue.');
    } finally {
      setLoading(false);
    }
  }, [toCard]);

  useEffect(() => { load(); }, [load]);

  // Live tickets. The socket prop was accepted and never used.
  useEffect(() => {
    if (!socket) return undefined;

    const onNew = () => load();
    const onProgress = () => load();

    socket.on('merchant_new_order', onNew);
    socket.on('kds_progress', onProgress);

    return () => {
      socket.off('merchant_new_order', onNew);
      socket.off('kds_progress', onProgress);
    };
  }, [socket, load]);

  const handleStatusChange = async (itemId, newStatus) => {
    const previous = orders;

    // Move the card immediately — a kitchen cannot wait on a round trip — but
    // put it back if the server refuses, rather than leaving the board showing
    // something that never happened.
    setOrders((prev) => prev.map((o) => (o.id === itemId ? { ...o, status: newStatus } : o)));

    try {
      await apiPut(`/shops/my-shop/kds/${itemId}`, {
        status: COLUMN_TO_STATUS[newStatus] || newStatus,
      });
    } catch (err) {
      setOrders(previous);
      setError(err?.message || 'That ticket could not be updated.');
    }
  };

  const renderCard = (order) => (
    <div className={`p-4 rounded-xl shadow-sm border ${order.isUrgent ? 'border-red-500 bg-red-50' : 'border-border bg-background'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-sm">#{order.ticketNumber || order.id}</h4>
        <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3 h-3"/> {order.time}</span>
      </div>
      <p className="text-sm font-medium mb-2">{order.content}</p>
      {order.instructions ? (
        <p className="text-xs text-text-muted italic mb-3">“{order.instructions}”</p>
      ) : null}
      {order.isUrgent && (
        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold flex w-fit items-center gap-1">
          <Flame className="w-3 h-3"/> PRIORITY
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cat-food/10 p-6 rounded-2xl border border-cat-food/20">
        <div>
          <h1 className="text-2xl font-bold text-cat-food flex items-center gap-2">
            <Utensils className="w-6 h-6" /> Kitchen Display System (KDS)
          </h1>
          <p className="text-text-muted text-sm mt-1">Manage food preparation pipeline</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-center">
            <p className="text-3xl font-black text-text">{orders.filter(o => o.status === 'new').length}</p>
            <p className="text-xs text-text-muted font-bold">NEW</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-text">{orders.filter(o => o.status === 'prep').length}</p>
            <p className="text-xs text-text-muted font-bold">PREP</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-text">{orders.filter(o => o.status === 'ready').length}</p>
            <p className="text-xs text-text-muted font-bold">READY</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-lg border border-border hover:bg-background"
            aria-label="Refresh the kitchen queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-red-500 bg-red-50 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={load} className="ml-auto underline font-semibold">Try again</button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-text-muted text-sm">Loading the kitchen queue…</p>
      ) : orders.length === 0 && !error ? (
        <div className="flex items-center gap-2 p-6 rounded-xl border border-border text-text-muted text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>No open tickets. New orders appear here as they arrive.</span>
        </div>
      ) : (
        <OrderKanban
          columns={COLUMNS}
          items={orders}
          onStatusChange={handleStatusChange}
          renderItem={renderCard}
        />
      )}
    </div>
  );
}
