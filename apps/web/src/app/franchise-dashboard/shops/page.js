'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Store, MapPin } from 'lucide-react';
import FranchiseShell, { useFranchiseData, when } from '../components/FranchiseShell';

// Shops in this partner's pincodes (GET /franchise/shops). This page used to
// list the first ten shops on the whole platform under a "mock filter".
export default function FranchiseShops() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const { data, loading, error, reload } = useFranchiseData(
    `/franchise/shops${applied ? `?search=${encodeURIComponent(applied)}` : ''}`
  );
  const shops = (data && data.shops) || [];

  const badge = (s) => {
    if (s.approvalStatus === 'approved' && s.active) return ['Active', 'bg-emerald-500/10 text-emerald-600'];
    if (s.approvalStatus === 'rejected') return ['Rejected', 'bg-red-500/10 text-red-600'];
    if (s.approvalStatus === 'approved') return ['Inactive', 'bg-slate-500/10 text-text-muted'];
    return ['Pending approval', 'bg-amber-500/10 text-amber-600'];
  };

  return (
    <FranchiseShell
      title="Territory Shops"
      subtitle="Shops registered in your pincodes."
      active="/franchise-dashboard/shops"
      loading={loading}
      error={error}
      onRetry={reload}
      empty={shops.length === 0}
      emptyText={applied ? `No shops match "${applied}".` : 'No shops are registered in your territory yet.'}
      actions={(
        <div className="flex flex-wrap gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setApplied(search.trim()); }} className="flex gap-2">
            <label htmlFor="shop-search" className="sr-only">Search shops by name</label>
            <input id="shop-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops" className="px-4 py-2 bg-card-bg border border-border rounded-xl text-text w-48" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-card-bg border border-border text-text">Search</button>
          </form>
          <Link href="/register-shop" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl">+ Onboard New Shop</Link>
        </div>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops.map((shop) => {
          const [label, cls] = badge(shop);
          return (
            <article key={shop.id} className="bg-card-bg border border-border rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-500">
                  <Store className="w-6 h-6" />
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${cls}`}>{label}</span>
              </div>
              <h3 className="text-xl font-bold text-text mb-1">{shop.name}</h3>
              <p className="text-text-muted text-sm mb-4 capitalize">{shop.category || 'Uncategorised'}</p>
              <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{shop.address || `PIN ${shop.pincode}`}</span>
              </div>
              <p className="text-xs text-text-muted">PIN {shop.pincode} · joined {when(shop.createdAt)}</p>
            </article>
          );
        })}
      </div>
    </FranchiseShell>
  );
}
