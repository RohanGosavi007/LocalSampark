'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/cartStore';
import { readRecent, clearRecent } from '@/lib/recentlyViewed';

/**
 * Saved items and recently viewed products (C12). The server kept a wishlist
 * (/wishlist) that no screen ever showed. Saved items are the customer's on
 * every device; recently viewed is this device's.
 */
const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function WishlistPage() {
  const { token, loading } = useAuth();
  const [items, setItems] = useState(null);
  const [recent, setRecent] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    apiGet('/wishlist').then((r) => setItems((r && r.items) || [])).catch(() => setItems([]));
  }, []);

  useEffect(() => { if (token) load(); }, [token, load]);
  useEffect(() => { try { setRecent(readRecent(window.localStorage)); } catch { setRecent([]); } }, []);

  const moveToCart = async (item) => {
    setBusy(item.productId);
    setNotice(null);
    try {
      await apiPost(`/wishlist/${encodeURIComponent(item.productId)}/move-to-cart`, {});
      // The server put it in the customer's cart; bring this screen's cart up to date.
      await useCartStore.getState().pullFromServer();
      setNotice({ ok: true, text: `${item.productName} is in your cart.` });
      load();
    } catch (e) {
      setNotice({ ok: false, text: e.message || 'Could not move it to the cart.' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item) => {
    setItems((list) => list.filter((i) => i.productId !== item.productId));
    try { await apiDelete(`/wishlist/${encodeURIComponent(item.productId)}`); } catch { load(); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 space-y-10">
          <section aria-labelledby="saved-heading">
            <h1 id="saved-heading" className="text-3xl font-heading font-black text-text mb-4">Saved items</h1>
            {!loading && !token && (
              <p className="text-text-muted"><Link href="/login" className="text-primary font-bold">Sign in</Link> to see the items you have saved.</p>
            )}
            {notice && <p role={notice.ok ? 'status' : 'alert'} className={`mb-3 font-semibold ${notice.ok ? 'text-green-700' : 'text-red-600'}`}>{notice.text} {notice.ok && <Link href="/checkout" className="underline">Go to cart</Link>}</p>}
            {token && items === null && <p className="text-text-muted">Loading…</p>}
            {items && items.length === 0 && <p className="text-text-muted">Nothing saved yet. Tap ♡ Save on a product to keep it here.</p>}
            <ul className="space-y-3">
              {(items || []).map((item) => (
                <li key={item.id} className="glass-card rounded-2xl border border-border p-4 flex gap-4 items-center" data-testid="saved-item">
                  <div className="w-16 h-16 rounded-xl bg-background-alt overflow-hidden shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/shops/${item.shopId}/products/${item.productId}`} className="font-bold text-text hover:text-primary">{item.productName}</Link>
                    <p className="text-sm text-text-muted">{item.shopName}</p>
                    <p className="font-black text-text">
                      {rupees(item.price)}
                      {item.mrp > item.price && <span className="ml-2 text-sm font-normal line-through text-text-muted">{rupees(item.mrp)}</span>}
                    </p>
                    {!item.isAvailable && <p className="text-sm font-bold text-red-500">Not available right now</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="button" disabled={!item.isAvailable || busy === item.productId} onClick={() => moveToCart(item)}
                      className="px-3 min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
                      {busy === item.productId ? 'Adding…' : 'Move to cart'}
                    </button>
                    <button type="button" onClick={() => remove(item)} className="px-3 min-h-[44px] rounded-xl border border-border text-sm font-bold text-text">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent-heading">
            <div className="flex items-baseline justify-between mb-3">
              <h2 id="recent-heading" className="text-xl font-bold text-text">Recently viewed</h2>
              {recent.length > 0 && (
                <button type="button" className="text-sm font-bold text-primary min-h-[44px]" onClick={() => setRecent(clearRecent(window.localStorage))}>Clear</button>
              )}
            </div>
            {recent.length === 0 && <p className="text-text-muted">Products you look at appear here.</p>}
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recent.map((p) => (
                <li key={p.productId} data-testid="recent-item">
                  <Link href={`/shops/${p.shopId}/products/${p.productId}`} className="block glass-card rounded-2xl border border-border p-3 hover:border-primary/50">
                    <div className="aspect-square rounded-xl bg-background-alt overflow-hidden mb-2">
                      {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <p className="font-bold text-sm text-text line-clamp-2">{p.name}</p>
                    <p className="text-sm text-text-muted">{rupees(p.price)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
