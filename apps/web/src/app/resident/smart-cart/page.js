'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { ShoppingBag, Truck, MapPin, Store, CheckCircle, ChevronRight, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SmartCartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mock multi-vendor cart
  const vendors = [
    {
      id: 'V-001',
      name: 'Balaji SuperMart',
      type: 'Grocery',
      distance: '1.2 km',
      items: [
        { name: 'Amul Taaza Milk 1L', price: 65, qty: 2 },
        { name: 'Aashirvaad Atta 5kg', price: 210, qty: 1 }
      ]
    },
    {
      id: 'V-002',
      name: 'Apollo Pharmacy',
      type: 'Medicine',
      distance: '1.5 km',
      items: [
        { name: 'Dolo 650 (15 Tabs)', price: 30, qty: 2 }
      ]
    },
    {
      id: 'V-003',
      name: 'Pune Baking Co.',
      type: 'Bakery',
      distance: '0.8 km',
      items: [
        { name: 'Whole Wheat Bread', price: 45, qty: 1 },
        { name: 'Chocolate Muffin', price: 60, qty: 2 }
      ]
    }
  ];

  const calculateSubtotal = (items) => items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  const totalItems = vendors.reduce((sum, v) => sum + calculateSubtotal(v.items), 0);
  
  // Smart Logistics Calculation
  const standardDeliveryFee = 40 * vendors.length; // If ordered separately: 120
  const smartDeliveryFee = 65; // Consolidated routing fee
  const savings = standardDeliveryFee - smartDeliveryFee;
  
  const platformFee = 15;
  const finalTotal = totalItems + smartDeliveryFee + platformFee;

  const handleCheckout = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h1 className="text-4xl font-black mb-4">Multi-Vendor Order Placed!</h1>
        <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
          Our smart logistics engine has dispatched a single rider to pick up from Balaji SuperMart, Apollo, and Pune Baking Co.
        </p>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm mb-8 text-left">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Truck size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Rider Assigned</p>
              <h3 className="text-white font-bold text-lg">Ramesh Kumar</h3>
            </div>
          </div>
          
          <div className="relative pl-6 border-l-2 border-slate-700 space-y-6">
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500"></div>
              <p className="text-sm font-bold text-slate-300">Pickup 1: Pune Baking Co.</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500"></div>
              <p className="text-sm font-bold text-slate-300">Pickup 2: Balaji SuperMart</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500"></div>
              <p className="text-sm font-bold text-slate-300">Pickup 3: Apollo Pharmacy</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
              <p className="text-sm font-bold text-emerald-400">Delivery to You</p>
            </div>
          </div>
        </div>

        <button onClick={() => router.push('/resident')} className="bg-white text-black font-bold py-3 px-8 rounded-full hover:bg-slate-200 transition-colors">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white pb-20">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-500/20 text-blue-500 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Multi-Vendor Smart Cart</h1>
            <p className="text-slate-400 text-sm">Combine orders from multiple local shops into a single delivery.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Vendors List */}
          <div className="lg:col-span-2 space-y-6">
            {vendors.map((vendor, index) => (
              <div key={vendor.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                      <Store size={18} className="text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{vendor.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        {vendor.type} • <MapPin size={12} /> {vendor.distance}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
                    Pickup #{index + 1}
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {vendor.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
                          {item.qty}x
                        </div>
                        <span className="font-medium text-slate-200">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-300">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Smart Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-24">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4">Smart Checkout</h3>
              
              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Item Total (3 Shops)</span>
                  <span>₹{totalItems}</span>
                </div>
                
                <div className="flex justify-between text-slate-400 line-through">
                  <span>Standard Delivery Fee (3x)</span>
                  <span>₹{standardDeliveryFee}</span>
                </div>
                
                <div className="flex justify-between text-blue-400 font-bold items-center">
                  <span className="flex items-center gap-1"><Zap size={14} /> Smart Routing Fee</span>
                  <span>₹{smartDeliveryFee}</span>
                </div>
                
                <div className="flex justify-between text-slate-300">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-between items-end">
                  <span className="text-slate-400">Total to Pay</span>
                  <span className="text-3xl font-black text-white">₹{finalTotal}</span>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                <p className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-1"><CheckCircle size={14} /> You Saved ₹{savings}!</p>
                <p className="text-slate-400 text-xs">Our logistics engine grouped your 3 orders into a single delivery route.</p>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={loading} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-pulse">Processing...</span> : <>Pay ₹{finalTotal} via UPI</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
