'use client';
import { useState, useEffect } from 'react';

export default function CommissionHub() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Mock fetch for admin dashboard components since actual implementations are not all in place yet.
    setTimeout(() => {
        setData({
            total_earned: 45000,
            total_convenience: 12000,
            pending_settlements: 23000,
            settlements_done: 85000,
            shops: [
                { id: '1', name: 'Sharma Grocery', category: 'Grocery', orders: 120, gross: 45000, commission: 2250, conv: 1200, net: 41550 }
            ]
        });
        setLoading(false);
    }, 500);
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
