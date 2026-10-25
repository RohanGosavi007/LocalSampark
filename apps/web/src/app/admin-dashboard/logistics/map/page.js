'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../../components/ui/Card';
import { Truck, Search } from 'lucide-react';
import { adminGet } from '@/lib/api';

// Delivery agents and the orders waiting for one, from /admin/delivery/*. This page used
// to show three invented deliveries and two animated truck icons over a placeholder map.
export default function AdminLiveDeliveryMap() {
  const [agents, setAgents] = useState([]);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, o] = await Promise.all([adminGet('/admin/delivery/agents'), adminGet('/admin/delivery/overview')]);
      setAgents(a.agents || []);
      setOverview(o);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load delivery agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const needle = search.trim().toLowerCase();
  const shown = agents.filter((a) => !needle || `${a.name || ''} ${a.phone || ''} ${a.vehicle_number || ''}`.toLowerCase().includes(needle));
  const isOnline = (a) => a.is_online === true || a.is_online === 1 || a.is_online === '1';

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6"><Truck className="w-6 h-6" /> Delivery fleet</h1>

      {error && <p role="alert" className="mb-4 text-red-500 font-bold">{error}</p>}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Agents online</div>
          <div className="text-3xl font-black">{overview ? overview.activeAgents : '…'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Accepted orders waiting for delivery</div>
          <div className="text-3xl font-black">{overview ? overview.pendingOrders : '…'}</div>
        </Card>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or vehicle…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-gray-500">{agents.length === 0 ? 'No delivery agents have registered yet.' : 'No agent matches that search.'}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((a) => (
            <Card key={a.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{a.name || 'Unnamed agent'}</div>
                <div className="text-sm text-gray-500">{a.phone || '—'} · {a.vehicle_type || 'vehicle n/a'}{a.vehicle_number ? ` · ${a.vehicle_number}` : ''}</div>
              </div>
              <div className="text-right text-xs font-bold uppercase">
                <span className={isOnline(a) ? 'text-green-600' : 'text-gray-400'}>{isOnline(a) ? 'Online' : 'Offline'}</span>
                <div className="text-gray-500">KYC: {a.kyc_status || 'pending'}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
