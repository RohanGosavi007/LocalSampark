'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Coins, Gift, RotateCw } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

// SamparkCoins: the signed-in person's balance and history (GET /loyalty/balance), the daily spin
// (POST /loyalty/spin) and redemption into the wallet (POST /loyalty/redeem). The spin result is
// decided and recorded by the server. This page used to spin a wheel in the browser with
// Math.random() and display "100 SC" or "Free Delivery" that were never credited, list invented
// streaks, badges and a leaderboard of invented people, and offer "₹50 Off at Sharma Grocery".
const MIN_REDEEM = 100;

export default function RewardsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [redeem, setRedeem] = useState('');

  const load = useCallback(() => {
    apiGet('/loyalty/balance')
      .then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(e.status === 401 ? 'Please log in to see your SamparkCoins.' : (e.message || 'Your coins could not be loaded.')));
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await fn();
      setMessage({ ok: true, text: r.message || 'Done.' });
      load();
    } catch (e) {
      setMessage({ ok: false, text: e.message || 'That did not work.' });
    } finally {
      setBusy(false);
    }
  };

  const spin = () => act(() => apiPost('/loyalty/spin', {}));
  const redeemNow = () => act(() => apiPost('/loyalty/redeem', { amountToRedeem: Number(redeem) }));
  const amount = Number(redeem);
  const canRedeem = Number.isInteger(amount) && amount >= MIN_REDEEM && data && amount <= data.totalCoins;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <h1 className="text-3xl font-heading font-black text-text">Rewards</h1>

          {error && <p role="alert" className="text-red-500 font-bold">{error}</p>}
          {!data && !error && <p className="text-text-muted">Loading…</p>}

          {data && (
            <>
              <div className="glass-card rounded-2xl border border-border p-6 flex items-center gap-4">
                <Coins className="w-10 h-10 text-amber-500" />
                <div>
                  <p className="text-3xl font-black text-text">{data.totalCoins} <span className="text-base font-bold text-text-muted">SamparkCoins</span></p>
                  <p className="text-sm text-text-muted">Worth ₹{Number(data.equivalentRupees).toFixed(2)} in your wallet</p>
                </div>
              </div>

              {message && <p role="status" className={`font-bold ${message.ok ? 'text-green-600' : 'text-red-500'}`}>{message.text}</p>}

              <div className="glass-card rounded-2xl border border-border p-6">
                <h2 className="font-bold text-text flex items-center gap-2 mb-2"><RotateCw className="w-5 h-5" /> Daily spin</h2>
                <p className="text-sm text-text-muted mb-4">One spin a day. What you win is added to your balance straight away.</p>
                <button type="button" disabled={busy} onClick={spin} className="bg-primary text-white font-bold px-5 py-2 rounded-xl disabled:opacity-60">{busy ? 'Working…' : 'Spin'}</button>
              </div>

              <div className="glass-card rounded-2xl border border-border p-6">
                <h2 className="font-bold text-text flex items-center gap-2 mb-2"><Gift className="w-5 h-5" /> Redeem to wallet</h2>
                <p className="text-sm text-text-muted mb-4">At least {MIN_REDEEM} coins. Every 100 coins become ₹10 in your wallet.</p>
                <div className="flex gap-3">
                  <input type="number" min={MIN_REDEEM} step="1" value={redeem} onChange={(e) => setRedeem(e.target.value)} placeholder={`${MIN_REDEEM}+`} aria-label="Coins to redeem" className="border border-border rounded-xl px-3 py-2 bg-background w-40" />
                  <button type="button" disabled={busy || !canRedeem} onClick={redeemNow} className="bg-primary text-white font-bold px-5 py-2 rounded-xl disabled:opacity-60">Redeem</button>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-border p-6">
                <h2 className="font-bold text-text mb-3">History</h2>
                {data.recentTransactions.length === 0 ? (
                  <p className="text-sm text-text-muted">No coin activity yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recentTransactions.map((t) => (
                      <li key={t.id} className="flex justify-between py-2 text-sm">
                        <span className="text-text">{t.source}<span className="text-text-muted"> · {t.date ? new Date(t.date).toLocaleDateString('en-IN') : ''}</span></span>
                        <span className={`font-bold ${t.amount < 0 || t.type === 'redeem' ? 'text-red-500' : 'text-green-600'}`}>{t.amount > 0 && t.type !== 'redeem' ? '+' : ''}{t.amount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
