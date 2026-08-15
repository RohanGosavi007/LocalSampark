'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { useRouter } from 'next/navigation';

export default function ShopDetailWeb({ params }) {
  const router = useRouter();
  const [cart, setCart] = useState([]);

  const [shop, setShop] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });

  // Safely get params (Next.js 14+ params might be a promise or direct)
  // But usually in page.js client component it's direct. If not, React.use() would be needed.
  // For simplicity, we just use params.id.
  const shopId = params?.id;

  React.useEffect(() => {
    if (!shopId) return;
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    async function loadData() {
      try {
        const [shopRes, prodRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/v1/shops/${shopId}`),
          fetch(`${BACKEND_URL}/api/v1/universal-catalog/${shopId}`)
        ]);
        
        const shopData = await shopRes.json();
        const prodData = await prodRes.json();
        
        if (shopData.success && shopData.shop) {
          setShop({
            name: shopData.shop.name || 'Local Shop',
            category: shopData.shop.category || 'Shop',
            rating: shopData.shop.rating || 4.8,
            reviews: shopData.shop.total_ratings || 124,
            deliveryTime: '15-20 mins',
            image: shopData.shop.cover_image || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1200&auto=format&fit=crop'
          });
        }
        
        if (prodData.success && prodData.catalog) {
          setMenu(prodData.catalog ? prodData.catalog.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category_id || p.category || 'General',
            desc: p.description || '',
            track_inventory: p.track_inventory,
            inventory_count: p.inventory_count
          })) : (Array.isArray(prodData) ? prodData : []).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category_id || p.category || 'General',
            desc: p.description || '',
            track_inventory: p.track_inventory,
            inventory_count: p.inventory_count
          })));
        }
      } catch (err) {
        console.error('Failed to fetch shop details', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [shopId]);

  if (loading) {
    return <div className="min-h-screen bg-background text-text flex items-center justify-center">Loading shop...</div>;
  }
  if (!shop) {
    return <div className="min-h-screen bg-background text-text flex items-center justify-center">Shop not found.</div>;
  }


  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id, change) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (item.qty + change <= 0) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: i.qty + change } : i);
    });
  };

  const cartTotal = cart.reduce((total, item) => total + (parseFloat(item.price) * item.qty), 0);

  return (
    <div className="min-h-screen bg-background text-text pb-20">
      <Header />
      
      {/* Banner */}
      <div className="relative h-64 w-full">
        <img src={shop.image} alt="Shop Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute bottom-0 left-0 p-8 w-full max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">{shop.name}</h1>
          <p className="text-slate-300 text-lg">{shop.category}</p>
          <div className="flex items-center space-x-6 mt-4">
            <span className="bg-slate-900/80 px-3 py-1 rounded-full text-sm font-bold text-white">⭐ {shop.rating} ({shop.reviews})</span>
            <span className="bg-slate-900/80 px-3 py-1 rounded-full text-sm font-bold text-white">⏱️ {shop.deliveryTime}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-12 flex space-x-12">
        {/* Menu Items */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Product Catalog</h2>

          {/* Category Tabs */}
          <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeCategory === 'All' ? 'bg-blue-600 text-white' : 'bg-card-bg text-text-muted hover:bg-slate-700'}`}
            >
              All
            </button>
            {Array.from(new Set(menu.map(item => item.category))).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-card-bg text-text-muted hover:bg-slate-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {menu.filter(item => activeCategory === 'All' || item.category === activeCategory).map(item => {
              const cartItem = cart.find(c => c.id === item.id);
              return (
                <div key={item.id} className="bg-card-bg border border-border p-6 rounded-xl flex flex-col justify-between hover:border-border transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-text">{item.name}</h3>
                    <p className="text-text-muted text-sm mt-1">{item.desc}</p>
                    <div className="text-xl font-bold text-green-400 mt-4 mb-4">₹{item.price}</div>
                  </div>

                  {item.track_inventory === 1 && item.inventory_count <= 0 ? (
                    <div className="w-32 bg-red-500/20 text-red-400 font-bold py-2 rounded-lg text-center">
                      Out of Stock
                    </div>
                  ) : cartItem ? (
                    <div className="flex items-center justify-between bg-background-alt rounded-lg p-1 w-32">
                      <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-blue-400 font-bold hover:bg-slate-700 rounded">-</button>
                      <span className="font-bold text-text">{cartItem.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        disabled={item.track_inventory === 1 && cartItem.qty >= item.inventory_count}
                        className={`w-8 h-8 flex items-center justify-center text-blue-400 font-bold rounded ${item.track_inventory === 1 && cartItem.qty >= item.inventory_count ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} className="w-32 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">
                      ADD
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Phase 13: QA Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Community Q&A</h2>
            <div className="bg-card-bg border border-border p-6 rounded-xl space-y-6">
              {[
                {q: 'Do you have fresh paneer today?', a: 'Yes, just arrived 10 mins ago!'},
                {q: 'Can you deliver to Ganga Aria?', a: 'Yes, delivery takes around 15 mins.'}
              ].map((qa, i) => (
                <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="font-bold text-text">Q: {qa.q}</p>
                  <p className="text-text-muted mt-2">A: {qa.a}</p>
                </div>
              ))}
              <div className="mt-4 pt-4 flex gap-2">
                <input type="text" placeholder="Ask the neighborhood or shop owner..." className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-text" />
                <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Ask</button>
              </div>
            </div>
          </div>

          {/* Phase 13: Society Verified Reviews */}
          <div className="mt-12 mb-12">
            <h2 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Society Verified Reviews</h2>
            <div className="space-y-4">
              {[
                {name: 'Ramesh P.', review: 'Excellent quality and fast delivery.', rating: 5, verified: true},
                {name: 'Sunita J.', review: 'Fresh vegetables always.', rating: 4, verified: true}
              ].map((rev, i) => (
                <div key={i} className="bg-card-bg border border-border p-6 rounded-xl flex gap-4">
                  <div className="w-12 h-12 bg-background-alt rounded-full flex items-center justify-center text-xl">👤</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-text">{rev.name}</h4>
                      {rev.verified && <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded-full font-bold">Society Verified Neighbor</span>}
                    </div>
                    <div className="text-yellow-400 my-1">{'★'.repeat(rev.rating)}</div>
                    <p className="text-text-muted">{rev.review}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Cart Sidebar */}
        <div className="w-96">
          <div className="bg-card-bg border border-border rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-text mb-6">Your Cart</h2>

            {cart.length === 0 ? (
              <div className="text-center text-text-muted py-12">
                <div className="text-4xl mb-4">🛒</div>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1 pr-4">
                        <div className="font-bold text-text">{item.name}</div>
                        <div className="text-text-muted">₹{item.price} × {item.qty}</div>
                      </div>
                      <div className="font-bold text-text">₹{item.price * item.qty}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border mt-6 pt-4 space-y-2">
                  <div className="flex justify-between text-text-muted text-sm">
                    <span>Item Total</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-text-muted text-sm">
                    <span>Delivery Fee</span>
                    <span>₹40</span>
                  </div>
                  <div className="flex justify-between font-bold text-text text-lg mt-4 border-t border-border pt-4">
                    <span>To Pay</span>
                    <span className="text-green-400">₹{cartTotal + 40}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-lg mt-6 transition-colors"
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg border border-border rounded-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-text mb-6">Complete Checkout</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-text-muted text-sm font-bold mb-2">Name</label>
                <input type="text" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text outline-none" />
              </div>
              <div>
                <label className="block text-text-muted text-sm font-bold mb-2">Phone</label>
                <input type="tel" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text outline-none" />
              </div>
              <div>
                <label className="block text-text-muted text-sm font-bold mb-2">Delivery Address</label>
                <textarea value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-text outline-none h-24 resize-none" />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowCheckout(false)} className="flex-1 bg-transparent border border-border hover:bg-background-alt text-text font-bold py-3 rounded-lg transition-colors">
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setCheckoutLoading(true);
                  try {
                    const res = await fetch(`/api/v1/checkout/create-order`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shopId, cart, ...checkoutForm })
                    });
                    const data = await res.json();
                    if (data.success && data.payment_flow === 'instant') {
                      // Trigger Razorpay
                      alert(`Proceeding to Razorpay for order: ${data.order_id}`);
                      router.push(`/tracking?order_id=${data.order_id || 'ORD-123'}`);
                    } else if (data.success) {
                      setCart([]);
                      setShowCheckout(false);
                      router.push(`/tracking?order_id=${data.order_id || 'ORD-123'}`);
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setCheckoutLoading(false);
                  }
                }}
                disabled={checkoutLoading || !checkoutForm.name || !checkoutForm.phone}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {checkoutLoading ? 'Processing...' : `Pay ₹${cart.reduce((s,i) => s + i.price * i.qty, 0) + 40}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
