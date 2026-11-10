'use client';
import React, { useState } from 'react';
import FranchiseShell, { useFranchiseData, inr, when } from '../components/FranchiseShell';

// Customers who have ordered from shops in this partner's pincodes
// (GET /franchise/territory-customers). Phone numbers arrive masked.
export default function FranchiseUsers() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const { data, loading, error, reload } = useFranchiseData(
    `/franchise/territory-customers${applied ? `?search=${encodeURIComponent(applied)}` : ''}`
  );
  const customers = (data && data.customers) || [];

  return (
    <FranchiseShell
      title="Territory Customers"
      subtitle="People who have ordered from shops in your pincodes."
      active="/franchise-dashboard/users"
      loading={loading}
      error={error}
      onRetry={reload}
      empty={customers.length === 0}
      emptyText={applied ? `No customers match "${applied}".` : 'No orders have been placed in your territory yet.'}
      actions={(
        <form onSubmit={(e) => { e.preventDefault(); setApplied(search.trim()); }} className="flex gap-2">
          <label htmlFor="cust-search" className="sr-only">Search customers by name</label>
          <input id="cust-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="px-4 py-2 bg-card-bg border border-border rounded-xl text-text w-56" />
          <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Search</button>
        </form>
      )}
    >
      <div className="overflow-x-auto bg-card-bg border border-border rounded-3xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Orders</th>
              <th className="p-4">Delivered value</th><th className="p-4">Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-4 font-semibold text-text">{c.name}</td>
                <td className="p-4 text-text-muted">{c.phone || '—'}</td>
                <td className="p-4">{c.orders}</td>
                <td className="p-4">{inr(c.deliveredValue)}</td>
                <td className="p-4 text-text-muted">{when(c.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FranchiseShell>
  );
}
