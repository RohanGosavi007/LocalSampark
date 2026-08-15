'use client';
import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, X, ShieldCheck, CheckCircle } from 'lucide-react';

export default function UpiGateway({ amount, onClose, onSuccess }) {
  const [status, setStatus] = useState('pending'); // pending, processing, success
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (timeLeft > 0 && status === 'pending') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, status]);

  const handleSimulatePayment = () => {
    setStatus('processing');
    // Simulate network delay for webhook confirmation
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 3000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-background p-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-green-500" size={24} />
            <h2 className="text-text font-bold text-lg">Secure Checkout</h2>
          </div>
          <button onClick={onClose} disabled={status !== 'pending'} className="text-text-muted hover:text-text transition-colors disabled:opacity-50">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center text-slate-900">
          
          <p className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">Total Amount</p>
          <h3 className="text-4xl font-black text-slate-900 mb-6">₹{amount}</h3>

          {status === 'success' ? (
            <div className="py-8 animate-fade-in flex flex-col items-center">
              <CheckCircle size={64} className="text-green-500 mb-4" />
              <h4 className="text-xl font-bold text-green-600 mb-1">Payment Successful</h4>
              <p className="text-text-muted text-sm">Redirecting to order confirmation...</p>
            </div>
          ) : status === 'processing' ? (
            <div className="py-8 animate-fade-in flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <h4 className="text-xl font-bold text-blue-600 mb-1">Processing Payment...</h4>
              <p className="text-text-muted text-sm">Waiting for bank confirmation</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="bg-slate-100 p-6 rounded-2xl mb-6 flex flex-col items-center border-2 border-dashed border-slate-300">
                <QrCode size={120} className="text-slate-800 mb-4" />
                <p className="text-sm font-bold text-slate-600">Scan with any UPI App</p>
                <div className="flex gap-2 mt-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">P</div>
                  <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs font-bold">Pt</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-text-muted text-xs font-bold uppercase">OR</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <button 
                onClick={handleSimulatePayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mb-4"
              >
                <Smartphone size={20} />
                Pay via UPI App
              </button>

              <p className="text-xs font-bold text-red-500">
                Expires in {formatTime(timeLeft)}
              </p>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 py-3 text-center border-t border-slate-200">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex justify-center items-center gap-1">
            <ShieldCheck size={12} /> Powered by LocalSampark Payments
          </p>
        </div>

      </div>
    </div>
  );
}
