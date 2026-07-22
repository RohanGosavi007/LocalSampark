const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'apps', 'web', 'src', 'app');

// 1. Create Individual Shop Page (Menu / Catalog)
const shopDir = path.join(webAppDir, 'shop', '[id]');
fs.mkdirSync(shopDir, { recursive: true });
fs.writeFileSync(path.join(shopDir, 'page.js'), `'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { useRouter } from 'next/navigation';

export default function ShopDetailWeb({ params }) {
  const router = useRouter();
  const [cart, setCart] = useState([]);

  const shop = {
    name: 'Sharma Grocery & Daily Needs',
    category: 'Grocery & Supermarket',
    rating: 4.8,
    reviews: 124,
    deliveryTime: '15-20 mins',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1200&auto=format&fit=crop'
  };

  const menu = [
    { id: 'p1', name: 'Amul Taaza Milk 500ml', price: '28', category: 'Dairy', desc: 'Fresh standardized milk' },
    { id: 'p2', name: 'Aashirvaad Atta 5kg', price: '240', category: 'Groceries', desc: '100% whole wheat chakki atta' },
    { id: 'p3', name: 'Maggi 2-Min Noodles', price: '14', category: 'Snacks', desc: 'Masala noodles single pack' },
    { id: 'p4', name: 'Amul Butter 100g', price: '58', category: 'Dairy', desc: 'Pasteurised butter' },
  ];

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
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
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
          <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">Product Catalog</h2>
          <div className="grid grid-cols-2 gap-6">
            {menu.map(item => {
              const cartItem = cart.find(c => c.id === item.id);
              return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    <p className="text-slate-400 text-sm mt-1">{item.desc}</p>
                    <div className="text-xl font-bold text-green-400 mt-4 mb-4">₹{item.price}</div>
                  </div>
                  
                  {cartItem ? (
                    <div className="flex items-center justify-between bg-slate-800 rounded-lg p-1 w-32">
                      <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-blue-400 font-bold hover:bg-slate-700 rounded">-</button>
                      <span className="font-bold text-white">{cartItem.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-blue-400 font-bold hover:bg-slate-700 rounded">+</button>
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
        </div>

        {/* Cart Sidebar */}
        <div className="w-96">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6">Your Cart</h2>
            
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <div className="text-4xl mb-4">🛒</div>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1 pr-4">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-slate-400">₹{item.price} × {item.qty}</div>
                      </div>
                      <div className="font-bold text-white">₹{item.price * item.qty}</div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-slate-800 mt-6 pt-4 space-y-2">
                  <div className="flex justify-between text-slate-400 text-sm">
                    <span>Item Total</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-sm">
                    <span>Delivery Fee</span>
                    <span>₹40</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-lg mt-4 border-t border-slate-800 pt-4">
                    <span>To Pay</span>
                    <span className="text-green-400">₹{cartTotal + 40}</span>
                  </div>
                </div>

                <button 
                  onClick={() => router.push('/checkout')}
                  className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-lg mt-6 transition-colors"
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// 2. Create Checkout Page
const checkoutDir = path.join(webAppDir, 'checkout');
fs.mkdirSync(checkoutDir, { recursive: true });
fs.writeFileSync(path.join(checkoutDir, 'page.js'), `'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import { useRouter } from 'next/navigation';

export default function CheckoutWeb() {
  const router = useRouter();
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const cartTotal = 340; // Mocked for speed
  const total = deliveryMode === 'delivery' ? cartTotal + 40 : cartTotal;

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      router.push('/tracking');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button onClick={() => router.back()} className="text-blue-400 hover:text-blue-300 font-medium mb-8">← Back to Shop</button>
        
        <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>
        
        {/* Delivery Modes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Select Order Type</h2>
          <div className="grid grid-cols-3 gap-6">
            <button 
              onClick={() => setDeliveryMode('delivery')}
              className={\`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-colors \${deliveryMode === 'delivery' ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}\`}
            >
              <span className="text-4xl mb-3">🛵</span>
              <span className={\`font-bold \${deliveryMode === 'delivery' ? 'text-blue-400' : 'text-slate-400'}\`}>Home Delivery</span>
            </button>
            <button 
              onClick={() => setDeliveryMode('pickup')}
              className={\`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-colors \${deliveryMode === 'pickup' ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}\`}
            >
              <span className="text-4xl mb-3">🚶</span>
              <span className={\`font-bold \${deliveryMode === 'pickup' ? 'text-blue-400' : 'text-slate-400'}\`}>Self Pickup</span>
            </button>
            <button 
              onClick={() => setDeliveryMode('dinein')}
              className={\`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-colors \${deliveryMode === 'dinein' ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}\`}
            >
              <span className="text-4xl mb-3">🍽️</span>
              <span className={\`font-bold \${deliveryMode === 'dinein' ? 'text-blue-400' : 'text-slate-400'}\`}>Dine-in</span>
            </button>
          </div>
        </div>
        
        {/* Payment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Payment</h2>
          
          <div className="border border-slate-800 rounded-lg p-6 mb-8 flex justify-between items-center bg-slate-950">
            <div>
              <div className="text-slate-400 text-sm">Total to Pay</div>
              <div className="text-3xl font-bold text-green-400 mt-1">₹{total}</div>
            </div>
          </div>
          
          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing Payment...' : 'Pay Now via UPI/Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
`);

// 3. Create Tracking Page
const trackingDir = path.join(webAppDir, 'tracking');
fs.mkdirSync(trackingDir, { recursive: true });
fs.writeFileSync(path.join(trackingDir, 'page.js'), `'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';

export default function TrackingWeb() {
  const [statusStep, setStatusStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setStatusStep(2), 3000); 
    const timer2 = setTimeout(() => setStatusStep(3), 6000); 
    const timer3 = setTimeout(() => setStatusStep(4), 9000); 
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const steps = [
    { id: 1, title: 'Order Placed', desc: 'Waiting for shop confirmation' },
    { id: 2, title: 'Order Accepted', desc: 'Shop has confirmed' },
    { id: 3, title: 'Preparing', desc: 'Items are being packed' },
    { id: 4, title: 'Out for Delivery', desc: 'Agent on the way' },
    { id: 5, title: 'Delivered', desc: 'Enjoy!' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">Order Tracking</h1>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
          <div className="h-64 bg-slate-800 flex items-center justify-center border-b border-slate-700 relative">
             <div className="text-6xl z-10">🗺️</div>
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
             <div className="absolute bottom-4 left-0 w-full text-center text-sm font-medium z-10 text-slate-300">Live GPS tracking active</div>
          </div>
          <div className="p-8 text-center">
            <div className="text-slate-400 font-medium mb-2">Estimated Arrival</div>
            <div className="text-4xl font-bold text-white">15-20 mins</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <div className="space-y-8">
            {steps.map((step, i) => {
              const isCompleted = statusStep > step.id;
              const isCurrent = statusStep === step.id;
              const isPending = statusStep < step.id;
              
              return (
                <div key={step.id} className="flex">
                  <div className="flex flex-col items-center mr-6">
                    <div className={\`w-8 h-8 rounded-full flex items-center justify-center z-10 \${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}\`}>
                      {isCompleted && '✓'}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={\`w-1 flex-1 -my-2 \${isCompleted || isCurrent ? 'bg-green-500' : 'bg-slate-800'}\`}></div>
                    )}
                  </div>
                  <div className="pb-8">
                    <h3 className={\`font-bold text-lg \${isPending ? 'text-slate-500' : 'text-white'}\`}>{step.title}</h3>
                    <p className="text-slate-400 mt-1">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
`);
