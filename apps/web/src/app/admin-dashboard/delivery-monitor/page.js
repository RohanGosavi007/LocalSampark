'use client';
import { useState, useEffect } from 'react';

export default function DeliveryMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetch for delivery monitor since API isn't fully integrated yet
    setTimeout(() => {
        setData({
            active_deliveries: 12,
            available_agents: 45,
            avg_time: '34 mins',
            deliveries: [
                { id: 'DEL-1001', order: 'ORD-8921', shop: 'Sharma Grocery', customer: 'Priya S.', agent: 'Ravi Kumar', status: 'picked_up', eta: '12 mins' },
                { id: 'DEL-1002', order: 'ORD-8919', shop: 'Daily Mart', customer: 'Amit P.', agent: 'Unassigned', status: 'searching_agent', eta: '--' }
            ]
        });
        setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div className="p-8 text-white">Loading Delivery Monitor...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Delivery Monitor</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Active Deliveries</div>
            <div className="text-2xl font-bold text-indigo-400">{data.active_deliveries}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Available Agents Online</div>
            <div className="text-2xl font-bold text-emerald-400">{data.available_agents}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Avg Delivery Time (Today)</div>
            <div className="text-2xl font-bold text-slate-200">{data.avg_time}</div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Live Deliveries</h2>
          <button className="bg-slate-700 px-4 py-2 rounded text-white text-sm">Configure Delivery Fees</button>
        </div>
        
        <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900">
                <tr>
                    <th className="p-3">Delivery ID</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Shop</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Agent</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">ETA</th>
                </tr>
            </thead>
            <tbody>
                {data.deliveries.map(del => (
                    <tr key={del.id} className="border-b border-slate-700">
                        <td className="p-3 font-semibold text-white">{del.id}</td>
                        <td className="p-3 text-indigo-400">{del.order}</td>
                        <td className="p-3">{del.shop}</td>
                        <td className="p-3">{del.customer}</td>
                        <td className="p-3">{del.agent}</td>
                        <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${del.status === 'searching_agent' ? 'bg-yellow-900 text-yellow-400' : 'bg-emerald-900 text-emerald-400'}`}>
                                {del.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </td>
                        <td className="p-3 text-right font-semibold">{del.eta}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
