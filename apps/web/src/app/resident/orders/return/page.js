'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { AlertCircle, Camera, CheckCircle, PackageX } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReturnRequestPage() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mock order details
  const order = {
    id: 'ORD-298371',
    shop: 'Balaji SuperMart',
    items: [
      { id: 'item1', name: 'Amul Taaza Milk 1L', price: 65, qty: 2 },
      { id: 'item2', name: 'Britannia Bread', price: 40, qty: 1 }
    ]
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />

      <div className="max-w-3xl mx-auto p-6 pt-24">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
            <PackageX className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text">Raise a Dispute</h1>
            <p className="text-text-muted mt-1 font-medium">Order {order.id} • {order.shop}</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="bg-background-alt border-2 border-green-500 rounded-3xl p-12 text-center shadow-[0_0_50px_rgba(34,197,94,0.15)] animate-fade-in">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-text mb-2">Dispute Raised Successfully</h2>
            <p className="text-text-muted mb-8 max-w-sm mx-auto">The shop owner has been notified. We will process your refund or replacement within 24 hours upon verification.</p>
            <button 
              onClick={() => router.push('/resident')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl transition-colors"
            >
              Return Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            
            <div className="bg-background-alt border border-border rounded-3xl p-6">
              <h3 className="font-bold text-text mb-4">1. Select Problematic Item</h3>
              <div className="space-y-3">
                {order.items.map(item => (
                  <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-colors ${selectedItem === item.id ? 'border-red-500 bg-red-500/10' : 'border-border bg-background hover:border-border'}`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="item"
                        value={item.id}
                        onChange={() => setSelectedItem(item.id)}
                        className="w-5 h-5 accent-red-500"
                        required
                      />
                      <div>
                        <h4 className="font-bold text-text">{item.name}</h4>
                        <p className="text-text-muted text-sm">Qty: {item.qty} • ₹{item.price * item.qty}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-background-alt border border-border rounded-3xl p-6">
              <h3 className="font-bold text-text mb-4">2. Reason & Proof</h3>

              <div className="mb-6">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Issue Description</label>
                <select
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-4 text-text outline-none focus:border-red-500 appearance-none"
                >
                  <option value="" disabled>Select issue type...</option>
                  <option value="spoiled">Item is Spoiled / Expired</option>
                  <option value="missing">Item was Missing</option>
                  <option value="wrong">Wrong Item Delivered</option>
                </select>
              </div>

              {reason && reason !== 'missing' && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Upload Photo Proof (Required)</label>
                  <div className="border-2 border-dashed border-border hover:border-red-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group bg-background-alt/30">
                    <div className="w-16 h-16 bg-card-bg group-hover:bg-red-500/20 text-text-muted group-hover:text-red-500 border border-border rounded-full flex items-center justify-center mb-4 transition-colors">
                      <Camera size={24} />
                    </div>
                    <p className="text-sm font-bold text-text">Tap to take photo</p>
                    <p className="text-xs text-text-muted mt-1">Clear photo of the defect or wrong item</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <p className="text-red-400 text-sm">
                <strong>Please Note:</strong> False claims will result in account suspension. By submitting, you confirm the provided information is accurate.
              </p>
            </div>

            <button 
              type="submit"
              disabled={!selectedItem || isSubmitting}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              {isSubmitting ? 'Submitting Dispute...' : 'Submit Return Request'}
            </button>
            
          </form>
        )}

      </div>
    </div>
  );
}
