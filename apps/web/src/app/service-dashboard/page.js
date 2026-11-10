'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { apiGet, apiPut } from '@/lib/api';

// Service provider dashboard. Reads the provider's real numbers
// (GET /services/dashboard), profile (GET /home-services/provider/me) and
// bookings (GET /home-services/provider/bookings), and acts on them through
// PUT /home-services/provider/bookings/:id/status and /provider/availability.
// It used to be a static page of invented KPI cards.

const NEXT_ACTIONS = {
  pending: [['confirmed', 'Accept'], ['rejected', 'Decline']],
  confirmed: [['in_progress', 'Start job'], ['cancelled', 'Cancel']],
  in_progress: [['completed', 'Mark completed']],
};
const FILTERS = [['', 'All'], ['pending', 'New'], ['confirmed', 'Confirmed'], ['in_progress', 'In progress'], ['completed', 'Completed']];
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ServiceDashboard() {
  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusQuery = filter ? `?status=${encodeURIComponent(filter)}` : '';
      const [dash, me, list] = await Promise.all([
        apiGet('/services/dashboard'),
        apiGet('/home-services/provider/me'),
        apiGet(`/home-services/provider/bookings${statusQuery}`),
      ]);
      setStats(dash.stats || null);
      setProviders(me.providers || []);
      setBookings(list.bookings || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (booking, status) => {
    setActionError('');
    let totalAmount;
    if (status === 'completed') {
      const entered = window.prompt('Final bill amount for this job (₹):', booking.inspection_fee || '');
      if (entered === null) return;
      totalAmount = Number(entered);
      if (!Number.isFinite(totalAmount) || totalAmount < 0) {
        setActionError('Enter a valid amount to complete the job.');
        return;
      }
    }
    setBusy(booking.id);
    try {
      await apiPut(`/home-services/provider/bookings/${booking.id}/status`, { status, totalAmount });
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not update the booking.');
    } finally {
      setBusy(null);
    }
  };

  const toggleAvailability = async () => {
    const next = !(providers && providers[0] && providers[0].available);
    setActionError('');
    try {
      await apiPut('/home-services/provider/availability', { available: next });
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not change availability.');
    }
  };

  const profile = providers && providers[0];
  const noProfile = providers && providers.length === 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Service Provider Dashboard</h1>
              <p className="text-text-muted">
                {profile ? `${profile.name} · ${profile.categoryName || 'Home services'}` : 'Manage your service requests and schedule.'}
              </p>
            </div>
            {profile && (
              <button onClick={toggleAvailability} className={`px-5 py-2 rounded-xl font-semibold border ${profile.available ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card-bg text-text border-border'}`}>
                {profile.available ? 'Accepting bookings' : 'Paused — tap to accept bookings'}
              </button>
            )}
          </div>

          {loading && !stats ? (
            <div className="grid gap-3" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-card-bg border border-border animate-pulse" />)}
            </div>
          ) : error ? (
            <div role="alert" className="text-center py-12 bg-card-bg border border-border rounded-3xl px-4">
              <h3 className="text-lg font-bold text-text mb-2">Could not load your dashboard</h3>
              <p className="text-text-muted mb-4">{error.message}</p>
              <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Try again</button>
            </div>
          ) : noProfile ? (
            <div className="text-center py-12 bg-card-bg border border-border rounded-3xl px-4">
              <h3 className="text-lg font-bold text-text mb-2">No service provider profile yet</h3>
              <p className="text-text-muted mb-4">Register your service to start receiving bookings from nearby customers.</p>
              <Link href="/services" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">Browse services</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                  ["Today's bookings", stats.todayBookings],
                  ['Completed today', stats.completedToday],
                  ['Upcoming', stats.upcomingBookings],
                  ['Earnings', inr(stats.totalEarnings)],
                  ['Rating', stats.avgRating ? `${Number(stats.avgRating).toFixed(1)} ★` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card-bg border border-border rounded-2xl p-5">
                    <p className="text-text-muted text-sm">{label}</p>
                    <p className="text-2xl font-bold text-text">{value}</p>
                  </div>
                ))}
              </div>

              <section aria-labelledby="bk-h" className="bg-card-bg border border-border rounded-3xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 id="bk-h" className="text-xl font-bold text-text">Bookings</h2>
                  <div className="flex gap-2 overflow-x-auto" role="tablist">
                    {FILTERS.map(([value, label]) => (
                      <button key={label} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${filter === value ? 'bg-blue-600 text-white' : 'bg-background text-text-muted'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {actionError && <p role="alert" className="text-sm text-red-600 mb-3">{actionError}</p>}
                {bookings.length === 0 ? (
                  <p className="text-text-muted">No bookings{filter ? ' with this status' : ' yet'}.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {bookings.map((b) => (
                      <li key={b.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text">{b.category_name || 'Service'} · {b.booking_ref}</p>
                          <p className="text-sm text-text-muted">
                            {b.booking_date} {b.time_slot} · {b.customer_name || 'Customer'} · {b.service_address} ({b.pincode})
                          </p>
                          {b.problem_description && <p className="text-sm text-text-muted mt-1">“{b.problem_description}”</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-background text-text-muted capitalize">{String(b.status).replace(/_/g, ' ')}</span>
                          {b.total_amount != null && <span className="text-sm font-semibold text-text">{inr(b.total_amount)}</span>}
                          {(NEXT_ACTIONS[b.status] || []).map(([status, label]) => (
                            <button key={status} disabled={busy === b.id} onClick={() => act(b, status)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${['rejected', 'cancelled'].includes(status) ? 'bg-background text-red-600 border border-border' : 'bg-blue-600 text-white'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
