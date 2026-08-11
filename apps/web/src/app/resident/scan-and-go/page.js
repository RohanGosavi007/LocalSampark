'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { ScanLine, ShoppingBag, ArrowRight, Store, X, Plus, Minus, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ScanAndGoPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);
  const [cart, setCart] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);

  const mockDb = {
    '8901030310243': { id: 'P-101', name: 'Amul Taaza Milk 1L', price: 65, image: 'https://via.placeholder.com/100' },
    '8901063143242': { id: 'P-102', name: 'Britannia Good Day Cookies', price: 30, image: 'https://via.placeholder.com/100' },
    '8901425010609': { id: 'P-103', name: 'Maggi 2-Min Noodles', price: 14, image: 'https://via.placeholder.com/100' }
  };

  const handleSimulateScan = (code) => {
    const item = mockDb[code];
    if (item) {
      setScanning(false);
      setScannedItem(item);
      setTimeout(() => {
        setCart([...cart, { ...item, qty: 1 }]);
        setScannedItem(null);
        setScanning(true);
      }, 1500);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = () => {
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-emerald-500 font-sans flex flex-col items-center justify-center p-6 text-white text-center">
        <CheckCircle size={80} className="mb-6" />
        <h1 className="text-4xl font-black mb-2">Payment Successful!</h1>
        <p className="text-emerald-100 text-lg mb-8 max-w-sm">Show this screen to the security guard on your way out.</p>
        
        <div className="bg-white text-black p-8 rounded-3xl w-full max-w-sm shadow-2xl mb-8">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="font-bold text-xl mb-1">Balaji SuperMart</h2>
          <p className="text-slate-500 text-sm mb-6">Order #SG-482910</p>
          
          <div className="border-t border-dashed border-slate-300 py-4 mb-4">
            <div className="flex justify-between items-center text-xl font-black">
              <span>Total Paid</span>
              <span>₹{total}</span>
            </div>
          </div>
          
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SG-482910" alt="Exit QR" className="mx-auto w-32 h-32" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4">Exit QR Code</p>
        </div>

        <button 
          onClick={() => router.push('/resident')}
          className="bg-black/20 hover:bg-black/30 backdrop-blur-md text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white flex flex-col">
      <Header />
      
      <div className="flex-1 flex flex-col md:flex-row pt-16">
        
        {/* Scanner Area */}
        <div className="flex-1 bg-black relative overflow-hidden flex flex-col items-center justify-center min-h-[50vh]">
          {/* Simulated Camera Feed Background */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center"></div>
          
          {/* Scanner Overlay */}
          <div className="relative z-10 w-full max-w-sm px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black mb-2 flex items-center justify-center gap-2">
                <ScanLine className="text-blue-500" /> Scan & Go
              </h2>
              <p className="text-slate-300 text-sm">Align the barcode within the frame</p>
            </div>

            <div className="aspect-square relative border-2 border-blue-500/50 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.2)] bg-black/40 backdrop-blur-sm flex items-center justify-center">
              
              {/* Scanning Animation */}
              {scanning && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
              )}

              {/* Corners */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>

              {/* Scanned Item Popup */}
              {scannedItem && (
                <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <CheckCircle size={48} className="text-white mb-4" />
                  <h3 className="font-bold text-lg mb-1">{scannedItem.name}</h3>
                  <p className="font-black text-2xl mb-4">₹{scannedItem.price}</p>
                  <p className="text-blue-200 text-sm font-bold">Added to Cart!</p>
                </div>
              )}

              {/* Mock Scan Buttons for Demo */}
              {scanning && (
                <div className="absolute bottom-4 flex gap-2">
                  <button onClick={() => handleSimulateScan('8901030310243')} className="bg-slate-800 text-xs px-3 py-1 rounded-full hover:bg-blue-600">Milk</button>
                  <button onClick={() => handleSimulateScan('8901063143242')} className="bg-slate-800 text-xs px-3 py-1 rounded-full hover:bg-blue-600">Cookies</button>
                  <button onClick={() => handleSimulateScan('8901425010609')} className="bg-slate-800 text-xs px-3 py-1 rounded-full hover:bg-blue-600">Maggi</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Digital Cart Sidebar */}
        <div className="w-full md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[50vh] md:h-[calc(100vh-64px)]">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShoppingBag size={20} /> Your Cart
            </h3>
            <span className="bg-blue-500 text-white text-xs font-black px-2 py-1 rounded-full">{cart.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                <p>Scan a product barcode to add it to your cart.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">{item.name}</h4>
                    <p className="text-blue-400 font-bold text-sm">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950 rounded-lg p-1 border border-slate-800">
                    <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"><Minus size={14} /></button>
                    <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                    <button className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"><Plus size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900">
            <div className="flex justify-between items-end mb-4">
              <span className="text-slate-400">Total</span>
              <span className="text-3xl font-black text-white">₹{total}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Pay via UPI <ArrowRight size={20} />
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">Skip the billing line. Just pay and walk out.</p>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
