'use client';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import { API_BASE } from '@/lib/api';
import { SORTS, readSearch, searchQuery, withChange, suggestionHref, productHref, rupees } from '@/lib/catalogSearch';

/**
 * C5: search the catalogue: products and shops, typo-tolerant, with
 * autocomplete and category and price filters.
 *
 * This page used to search shops alone (GET /shops/search): no product could
 * be found by name, and a typo found nothing. It now reads
 * GET /shops/search/catalog and GET /shops/search/suggest. The search lives in
 * the URL, so it can be shared and the back button works.
 */
const PAGE = 20;

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const search = readSearch(params);
  const key = searchQuery(search);

  const [text, setText] = useState(search.q);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(search.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(search.maxPrice ?? '');
  const timer = useRef(null);

  const go = (next) => router.push(`/search?${searchQuery(next)}`);

  // The results, whenever the search in the URL changes.
  useEffect(() => {
    setText(search.q);
    setMinPrice(search.minPrice ?? '');
    setMaxPrice(search.maxPrice ?? '');
    if (!search.q) { setResult(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/shops/search/catalog?${searchQuery(search, { limit: PAGE })}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || 'Search is not available right now.');
        setResult(data);
      })
      .catch((e) => { if (!cancelled) { setResult(null); setError(e.message || 'Search is not available right now.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Suggestions while typing.
  useEffect(() => {
    clearTimeout(timer.current);
    const q = text.trim();
    if (q.length < 2 || q === search.q) { setSuggestions([]); return undefined; }
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/shops/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []))
        .catch(() => setSuggestions([]));
    }, 180);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const loadMore = async () => {
    setMore(true);
    try {
      const r = await fetch(`${API_BASE}/shops/search/catalog?${searchQuery(search, { limit: PAGE, offset: result.products.length })}`);
      const data = await r.json();
      if (data.success) setResult((prev) => ({ ...prev, products: [...prev.products, ...data.products] }));
    } finally {
      setMore(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    const q = text.trim();
    if (q.length < 2) { setError('Type at least two letters to search.'); return; }
    // A new query starts without the old filters.
    go({ q, sort: search.sort });
  };

  const applyPrice = (e) => {
    e.preventDefault();
    const lo = minPrice === '' ? null : Number(minPrice);
    const hi = maxPrice === '' ? null : Number(maxPrice);
    if (lo !== null && hi !== null && lo > hi) { setError('The lowest price is above the highest.'); return; }
    go(withChange(search, { minPrice: lo, maxPrice: hi }));
  };

  const facets = result && result.facets;
  const filtered = search.category || search.minPrice !== null || search.maxPrice !== null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-3xl font-bold text-text mb-6">Search</h1>

        <form onSubmit={submit} className="relative flex gap-3 mb-8" role="search">
          <label htmlFor="catalog-search" className="sr-only">Search products and shops</label>
          <input
            id="catalog-search"
            type="search"
            role="combobox"
            autoComplete="off"
            value={text}
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search for atta, bread, medicines, a shop…"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={open && suggestions.length > 0}
            className="flex-1 bg-card-bg border border-border rounded-xl px-5 py-3 text-text outline-none text-lg focus:border-primary"
          />
          <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold px-6 rounded-xl">Search</button>
          {open && suggestions.length > 0 && (
            <ul id="search-suggestions" role="listbox" aria-label="Suggestions" className="absolute top-full left-0 right-24 mt-2 bg-card-bg border border-border rounded-xl shadow-xl z-20 overflow-hidden">
              {suggestions.map((s) => (
                <li key={`${s.type}-${s.id}`} role="option" aria-selected="false">
                  <Link href={suggestionHref(s) || `/search?q=${encodeURIComponent(s.label)}`} className="flex justify-between gap-3 px-4 py-2 hover:bg-background-alt text-sm">
                    <span className="text-text">{s.label}</span>
                    <span className="text-text-muted">{s.type === 'shop' ? 'Shop' : s.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </form>

        {error && <p role="alert" className="text-red-400 mb-6">{error}</p>}
        {!search.q && !error && <p className="text-text-muted">Search every shop near you for products by name, brand or category.</p>}
        {loading && <p className="text-text-muted py-8">Searching…</p>}

        {!loading && result && (
          <div className="grid gap-8 md:grid-cols-[220px_1fr]">
            <aside aria-label="Filters" className="space-y-6">
              {facets && facets.categories.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2">Category</h2>
                  <ul className="space-y-1" data-testid="category-facet">
                    {facets.categories.map((c) => (
                      <li key={c.name}>
                        <button
                          type="button"
                          aria-pressed={String(search.category || '').toLowerCase() === c.name.toLowerCase()}
                          onClick={() => go(withChange(search, { category: String(search.category || '').toLowerCase() === c.name.toLowerCase() ? null : c.name }))}
                          className={`w-full flex justify-between text-left px-3 py-1.5 rounded-lg text-sm ${String(search.category || '').toLowerCase() === c.name.toLowerCase() ? 'bg-primary/15 text-primary font-bold' : 'text-text hover:bg-background-alt'}`}
                        >
                          <span>{c.name}</span><span className="text-text-muted">{c.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {facets && facets.price && (
                <form onSubmit={applyPrice}>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2">Price</h2>
                  <p className="text-xs text-text-muted mb-2">{rupees(facets.price.min)} – {rupees(facets.price.max)}</p>
                  <div className="flex gap-2 mb-2">
                    <label className="sr-only" htmlFor="min-price">Lowest price</label>
                    <input id="min-price" inputMode="decimal" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-card-bg border border-border rounded-lg px-2 py-1 text-sm" />
                    <label className="sr-only" htmlFor="max-price">Highest price</label>
                    <input id="max-price" inputMode="decimal" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full bg-card-bg border border-border rounded-lg px-2 py-1 text-sm" />
                  </div>
                  <button type="submit" className="w-full border border-primary text-primary font-bold rounded-lg py-1 text-sm">Apply price</button>
                </form>
              )}
              {filtered && (
                <button type="button" onClick={() => go({ q: search.q, sort: search.sort })} className="text-sm text-text-muted underline">
                  Clear filters
                </button>
              )}
            </aside>

            <section aria-label="Results">
              {result.shops && result.shops.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2">Shops</h2>
                  <ul className="flex flex-wrap gap-2" data-testid="shop-results">
                    {result.shops.map((s) => (
                      <li key={s.id}>
                        <Link href={`/shops/${encodeURIComponent(s.id)}`} className="inline-block bg-card-bg border border-border hover:border-primary rounded-full px-4 py-1.5 text-sm text-text">
                          {s.name}{s.category ? <span className="text-text-muted"> · {s.category}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-text-muted" role="status">
                  {result.total === 0 ? `No products found for “${search.q}”.` : `${result.total} product${result.total === 1 ? '' : 's'} for “${search.q}”`}
                </p>
                <label className="text-sm text-text-muted flex items-center gap-2">
                  Sort
                  <select value={search.sort} onChange={(e) => go(withChange(search, { sort: e.target.value }))} className="bg-card-bg border border-border rounded-lg px-2 py-1 text-text">
                    {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              </div>

              {result.total === 0 && filtered && <p className="text-text-muted text-sm mb-4">Try clearing the filters.</p>}

              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="product-results">
                {result.products.map((p) => (
                  <li key={p.id}>
                    <Link href={productHref(p)} className="block h-full bg-card-bg border border-border hover:border-primary rounded-xl p-4">
                      {p.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                        : <div className="w-full h-32 rounded-lg mb-3 bg-background-alt" aria-hidden="true" />}
                      <h3 className="font-bold text-text">{p.name}</h3>
                      <p className="text-sm text-text-muted">{p.shop.name}{p.netQuantity ? ` · ${p.netQuantity}` : ''}</p>
                      <p className="mt-2 font-black text-text">
                        {rupees(p.price)}
                        {p.mrp && p.mrp > p.price ? <span className="ml-2 text-sm font-normal text-text-muted line-through">{rupees(p.mrp)}</span> : null}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {result.products.length < result.total && (
                <button type="button" onClick={loadMore} disabled={more} className="mt-6 w-full border border-border rounded-xl py-3 font-bold text-text disabled:opacity-50">
                  {more ? 'Loading…' : 'Show more'}
                </button>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SearchPageInner />
    </Suspense>
  );
}
