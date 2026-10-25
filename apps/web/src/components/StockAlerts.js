'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

// Products of the signed-in shop that are at or below their reorder level, from GET /shops/my-shop.
// This listed "Amul Taaza Milk 1L — 2 left" and two other invented items for every shop.
const DEFAULT_THRESHOLD = 5;

export default function StockAlerts() {
  const [lowStockItems, setLow] = useState([]);

  useEffect(() => {
    let alive = true;
    apiGet('/shops/my-shop')
      .then((r) => {
        if (!alive) return;
        const rows = (r.products || [])
          .filter((p) => Number(p.track_inventory))
          .map((p) => ({ id: p.id, name: p.name, stock: Number(p.inventory_count ?? p.stock_quantity ?? 0), threshold: Number(p.low_stock_threshold) || DEFAULT_THRESHOLD }))
          .filter((p) => p.stock <= p.threshold)
          .sort((a, b) => a.stock - b.stock);
        setLow(rows);
      })
      .catch(() => { if (alive) setLow([]); });
    return () => { alive = false; };
  }, []);

  if (lowStockItems.length === 0) return null;

  return (
    <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
          <AlertTriangle fill="currentColor" /> Low Stock Alerts
        </h3>
        <span className="bg-red-500 text-white font-black text-xs px-2 py-1 rounded-full">{lowStockItems.length} Items</span>
      </div>

      <div className="space-y-3">
        {lowStockItems.map((item) => (
          <div key={item.id} className="bg-background border border-red-500/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <h4 className="font-bold text-text">{item.name}</h4>
              <p className="text-red-400 text-xs font-bold mt-1 flex items-center gap-1">
                <TrendingDown size={12} /> {item.stock === 0 ? 'Out of stock' : `Only ${item.stock} left`} (reorder level {item.threshold})
              </p>
            </div>
            <Link href="/shop-manager/inventory" className="bg-card-bg border border-border text-text text-xs font-bold px-4 py-2 rounded-lg">
              Update Stock
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
