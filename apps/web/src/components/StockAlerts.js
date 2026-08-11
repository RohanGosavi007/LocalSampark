import React from 'react';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export default function StockAlerts() {
  const lowStockItems = [
    { id: 1, name: 'Amul Taaza Milk 1L', stock: 2, threshold: 5 },
    { id: 2, name: 'Aashirvaad Atta 5kg', stock: 0, threshold: 5 },
    { id: 3, name: 'Maggi 2-Min Noodles', stock: 4, threshold: 10 }
  ];

  if (lowStockItems.length === 0) return null;

  return (
    <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
          <AlertTriangle fill="currentColor" /> Low Stock Alerts
        </h3>
        <span className="bg-red-500 text-white font-black text-xs px-2 py-1 rounded-full">
          {lowStockItems.length} Items
        </span>
      </div>

      <div className="space-y-3">
        {lowStockItems.map(item => (
          <div key={item.id} className="bg-slate-900 border border-red-500/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <h4 className="font-bold text-slate-200">{item.name}</h4>
              <p className="text-red-400 text-xs font-bold mt-1 flex items-center gap-1">
                <TrendingDown size={12} /> Only {item.stock} left (Threshold: {item.threshold})
              </p>
            </div>
            <Link 
              href="/shop-manager/inventory"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Update Stock
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
