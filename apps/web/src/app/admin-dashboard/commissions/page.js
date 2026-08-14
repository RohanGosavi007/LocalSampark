'use client';
import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';

export default function CommissionHub() {
  const [data, setData] = useState({
    total_earned: 0,
    total_convenience: 0,
    pending_settlements: 0,
    settlements_done: 0,
    shops: []
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_BASE}/admin/payouts/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        // Use real backend data if available, fallback to zeros
        if (json.success && json.data) {
          const shopPayouts = json.data.shopOwner || [];
          
          setData({
            total_earned: shopPayouts.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) * 0.05, // 5% mock comm
            total_convenience: shopPayouts.length * 15, // mock 15rs conv fee
            pending_settlements: shopPayouts.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
            settlements_done: 85000, // mock historic
            shops: shopPayouts.map(p => ({
              id: p.id,
              name: p.payee,
              category: p.type,
              orders: Math.floor(Math.random() * 50) + 1,
              gross: parseFloat(p.amount || 0),
              commission: parseFloat(p.amount || 0) * 0.05,
              conv: 15,
              net: parseFloat(p.amount || 0) - (parseFloat(p.amount || 0) * 0.05) - 15
            }))
          });
        }
      } catch (err) {
        console.error('Failed to fetch commissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-white">Loading Commission Hub...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Commission Hub</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Total Comm. Earned</div>
            <div className="text-2xl font-bold text-emerald-400">₹{data.total_earned}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Total Conv. Fees</div>
            <div className="text-2xl font-bold text-emerald-400">₹{data.total_convenience}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Pending Settlements</div>
            <div className="text-2xl font-bold text-yellow-400">₹{data.pending_settlements}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-sm text-slate-400">Settlements Done</div>
            <div className="text-2xl font-bold text-slate-200">₹{data.settlements_done}</div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Per-Shop Commission & Override</h2>
          <button className="bg-indigo-600 px-4 py-2 rounded text-white text-sm font-semibold">Batch Settle All Pending</button>
        </div>
        
        <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900">
                <tr>
                    <th className="p-3">Shop</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Orders</th>
                    <th className="p-3 text-right">Gross</th>
                    <th className="p-3 text-right">Comm. Collected</th>
                    <th className="p-3 text-right">Conv. Fees</th>
                    <th className="p-3 text-right">Net to Shop</th>
                    <th className="p-3 text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                {data.shops.map(shop => (
                    <tr key={shop.id} className="border-b border-slate-700">
                        <td className="p-3 font-semibold text-white">{shop.name}</td>
                        <td className="p-3">{shop.category}</td>
                        <td className="p-3 text-right">{shop.orders}</td>
                        <td className="p-3 text-right">₹{shop.gross}</td>
                        <td className="p-3 text-right text-emerald-400">₹{shop.commission}</td>
                        <td className="p-3 text-right text-emerald-400">₹{shop.conv}</td>
                        <td className="p-3 text-right">₹{shop.net}</td>
                        <td className="p-3 text-center">
                            <button className="text-indigo-400 hover:text-indigo-300 mr-3">Set Override</button>
                            <button className="text-emerald-400 hover:text-emerald-300">Settle</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
