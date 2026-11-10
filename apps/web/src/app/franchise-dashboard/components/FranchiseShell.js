'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { apiGet } from '@/lib/api';

/** Loads `/api/v1<path>` with the signed-in session; exposes loading / error / reload. */
export function useFranchiseData(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet(path));
    } catch (err) {
      setData(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

const NAV = [
  ['/franchise-dashboard', 'Overview'],
  ['/franchise-dashboard/zones', 'Zones'],
  ['/franchise-dashboard/shops', 'Shops'],
  ['/franchise-dashboard/users', 'Customers'],
  ['/franchise-dashboard/revenue', 'Revenue'],
  ['/franchise-dashboard/reports', 'Reports'],
  ['/franchise-dashboard/marketing', 'Marketing'],
  ['/franchise-dashboard/settings', 'Settings'],
];

/** Page frame for the franchise dashboard: title, section nav, and the three non-data states. */
export default function FranchiseShell({ title, subtitle, active, loading, error, onRetry, empty, emptyText, children, actions }) {
  const forbidden = error && (error.status === 401 || error.status === 403);
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-black text-text mb-2">{title}</h1>
              {subtitle && <p className="text-text-muted">{subtitle}</p>}
            </div>
            {actions}
          </div>

          <nav aria-label="Franchise dashboard sections" className="flex gap-2 overflow-x-auto pb-2 mb-8">
            {NAV.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={active === href ? 'page' : undefined}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border ${active === href ? 'bg-blue-600 text-white border-blue-600' : 'bg-card-bg text-text-muted border-border hover:text-text'}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {loading ? (
            <div className="grid gap-3" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-card-bg border border-border animate-pulse" />)}
            </div>
          ) : error ? (
            <div role="alert" className="text-center py-12 bg-card-bg border border-border rounded-3xl px-4">
              <h3 className="text-lg text-text font-bold mb-2">
                {forbidden ? 'This page is for franchise partners' : 'Could not load this page'}
              </h3>
              <p className="text-text-muted mb-4">{error.message}</p>
              {!forbidden && onRetry && (
                <button onClick={onRetry} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Try again</button>
              )}
            </div>
          ) : empty ? (
            <div className="text-center py-12 bg-card-bg border border-border rounded-3xl px-4">
              <p className="text-text-muted">{emptyText || 'Nothing to show yet.'}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const when = (v) => {
  if (!v) return '—';
  const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
