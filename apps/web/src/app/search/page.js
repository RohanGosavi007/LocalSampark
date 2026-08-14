'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Header from '../components/Header';
import ShareWidget from '../../components/ShareWidget';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Megaphone, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';

function GlobalSearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Need context to dispatch cart adds
  const { dispatch } = useCart() || { dispatch: () => {} };

  // Mock Ad Engine Response
  const [sponsoredProducts, setSponsoredProducts] = useState([]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    // Simulate Ad Engine Matching
    const lowerQ = searchQuery.toLowerCase();
    if (lowerQ.includes('milk') || lowerQ.includes('dairy')) {
      setSponsoredProducts([{ id: 'AD1', name: 'Amul Taaza Toned Milk 1L', price: 68, shop: 'Balaji SuperMart' }]);
    } else if (lowerQ.includes('bread') || lowerQ.includes('bakery')) {
      setSponsoredProducts([{ id: 'AD2', name: 'Premium Multigrain Bread', price: 55, shop: 'Pune Baking Co.' }]);
    } else {
      setSponsoredProducts([{ id: 'AD3', name: 'Aashirvaad Atta 5kg', price: 210, shop: 'Green Grocers' }]);
    }

    try {
      setLoading(true);
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
    <div className="min-h-screen bg-slate-950">
      <Header />
      <div className="max-w-4xl mx-auto p-6 pt-24">
        <h1 className="text-3xl font-bold text-white mb-8">Search Directory</h1>
        
        <form onSubmit={onSubmit} className="flex gap-4 mb-12">
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for groceries, electronics, services..." 
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 text-white outline-none text-lg"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-colors">
            Search
          </button>
        </form>

        {loading ? (
          <div className="text-center text-slate-500 py-12">Searching global directory...</div>
        ) : (
          <div className="space-y-8">
            
            {/* Sponsored Retail Media Ad Block */}
            {sponsoredProducts.length > 0 && query && (
              <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="text-blue-400 w-5 h-5" />
                  <h3 className="text-blue-100 font-bold">Sponsored Products</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {sponsoredProducts.map(p => (
                    <div key={p.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col hover:border-blue-500 transition-colors">
                      <div className="bg-blue-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded self-start mb-2">Ad</div>
                      <h4 className="font-bold text-white mb-1 line-clamp-1">{p.name}</h4>
                      <p className="text-xs text-slate-400 mb-3">{p.shop}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="font-black text-lg text-blue-400">₹{p.price}</span>
                        <button 
                          onClick={() => {
                            if (dispatch) {
                              dispatch({ type: 'ADD_ITEM', payload: { ...p, quantity: 1 } });
                              alert(`${p.name} added to cart from Sponsored Ad!`);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                        >
                          <ShoppingCart size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-300 mb-6">Found {results.length} local shops</h2>
            {results.map(shop => (
              <div 
                key={shop.id} 
                className={`bg-slate-900 border p-6 rounded-xl flex gap-6 transition-colors ${shop.is_promoted ? 'border-yellow-500/50 hover:border-yellow-400 bg-yellow-500/5' : 'border-slate-800 hover:border-blue-500'}`}
              >
                <div 
                    onClick={() => router.push(`/shop/${shop.id}`)}
                    className="w-24 h-24 bg-slate-800 rounded-lg flex items-center justify-center text-3xl shrink-0 cursor-pointer"
                >
                  🏪
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div onClick={() => router.push(`/shop/${shop.id}`)} className="cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white hover:text-blue-400">{shop.name}</h3>
                        {shop.is_promoted ? (
                          <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            Ad
                          </span>
                        ) : null}
                      </div>
                      <p className="text-slate-400 mb-2">{shop.description || 'Local shop in your area.'}</p>
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
              <div className="text-center text-slate-500 py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
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
