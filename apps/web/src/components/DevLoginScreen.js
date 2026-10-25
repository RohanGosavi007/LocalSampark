'use client';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Each persona names a role in AuthContext's DEMO_PHONES (the accounts
// seed-investor-demo.js creates) and the screen that role demos best. The
// society personas were missing, so the gate-to-resident flow — the most
// visibly real-time part of the product — could not be shown from here.
const PERSONAS = [
  { role: 'user', label: 'Consumer', route: '/', className: 'bg-blue-600 hover:bg-blue-500' },
  { role: 'resident_member', label: 'Resident', route: '/society', className: 'bg-cyan-700 hover:bg-cyan-600' },
  { role: 'society_admin', label: 'Committee', route: '/society', className: 'bg-indigo-600 hover:bg-indigo-500' },
  { role: 'security_guard', label: 'Gate guard', route: '/gatekeeper', className: 'bg-amber-700 hover:bg-amber-600' },
  { role: 'shop_owner', label: 'Merchant', route: '/shop-dashboard', className: 'bg-emerald-600 hover:bg-emerald-500' },
  { role: 'service_provider', label: 'Service pro', route: '/shop-dashboard', className: 'bg-emerald-800 hover:bg-emerald-700' },
  { role: 'delivery_agent', label: 'Rider', route: '/delivery-dashboard', className: 'bg-purple-600 hover:bg-purple-500' },
  { role: 'user', label: 'Commuter', route: '/carpool', className: 'bg-teal-700 hover:bg-teal-600' },
  { role: 'user', label: 'Job seeker', route: '/jobs', className: 'bg-rose-700 hover:bg-rose-600' },
  { role: 'super_admin', label: 'Admin', route: '/admin-dashboard', className: 'bg-rose-600 hover:bg-rose-500' },
];

export default function DevLoginScreen() {
  const { demoLogin } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  if (process.env.NODE_ENV !== 'development') return null;

  const switchTo = async (p) => {
    setBusy(p.label);
    if (!(await demoLogin(p.role))) {
      setBusy(null);
      window.alert('Demo sign-in failed. Seed the demo data: npm run seed:demo --workspace=backend');
      return;
    }
    // Full reload so the guarded destination route picks up the freshly-written
    // AuthContext/localStorage state immediately instead of racing React state.
    window.location.href = p.route;
  };

  if (!open) {
    return (
      <button
        data-dev-dock
        onClick={() => setOpen(true)}
        aria-label="Open demo persona switcher"
        className="fixed bottom-4 right-4 z-[9999] h-11 min-w-11 px-3 rounded-full bg-slate-950/90 border border-slate-700 text-white text-xs font-bold shadow-2xl"
      >
        👤 Personas
      </button>
    );
  }

  return (
    <div data-dev-dock className="fixed bottom-4 right-4 z-[9999] bg-slate-950/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider">Switch persona</h3>
        <button onClick={() => setOpen(false)} aria-label="Close persona switcher" className="text-slate-300 h-11 w-11 -mr-3 -my-3">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PERSONAS.map((p) => (
          <button
            key={p.label}
            onClick={() => switchTo(p)}
            disabled={Boolean(busy)}
            className={`${p.className} min-h-11 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60`}
          >
            {busy === p.label ? 'Signing in…' : p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
