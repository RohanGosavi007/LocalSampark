'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Header from '../components/Header';
import ShareWidget from '../../components/ShareWidget';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star } from 'lucide-react';
import { API_URL } from '@/lib/api';

function GlobalSearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const BACKEND_URL = API_URL;
      const res = await fetch(`${BACKEND_URL}/api/v1/shops/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.shops || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto p-6 pt-24">
        <h1 className="text-3xl font-bold text-text mb-8">Search Directory</h1>

        <form onSubmit={onSubmit} className="flex gap-4 mb-12">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for groceries, electronics, services..."
            className="flex-1 bg-card-bg border border-border rounded-xl px-6 py-4 text-text outline-none text-lg"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-colors">
            Search
          </button>
        </form>

        {loading ? (
          <div className="text-center text-text-muted py-12">Searching global directory...</div>
        ) : (
          <div className="space-y-8">
            
            {results.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-text-muted mb-6">Found {results.length} local shops</h2>
            {results.map(shop => (
              <div
                key={shop.id}
                className={`bg-card-bg border p-6 rounded-xl flex gap-6 transition-colors ${shop.is_promoted ? 'border-yellow-500/50 hover:border-yellow-400 bg-yellow-500/5' : 'border-border hover:border-blue-500'}`}
              >
                <div
                    onClick={() => router.push(`/shops/${shop.id}`)}
                    className="w-24 h-24 bg-background-alt rounded-lg flex items-center justify-center text-3xl shrink-0 cursor-pointer"
                >
                  🏪
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div onClick={() => router.push(`/shops/${shop.id}`)} className="cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-text hover:text-blue-400">{shop.name}</h3>
                        {shop.is_promoted ? (
                          <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            Ad
                          </span>
                        ) : null}
                      </div>
                      <p className="text-text-muted mb-2">{shop.description || 'Local shop in your area.'}</p>
                    </div>
                    <ShareWidget shopName={shop.name} shopSlug={shop.id} />
                  </div>
                  <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                    {shop.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
            ) : query ? (
              <div className="text-center text-text-muted py-12 bg-background-alt rounded-2xl border border-border">
                <p>No organic shops found for "{query}".</p>
                <p className="text-sm mt-2">Try a broader term or check the sponsored products above!</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}


export default function GlobalSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <GlobalSearchPageInner />
    </Suspense>
  );
}
