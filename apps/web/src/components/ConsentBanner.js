'use client';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import Link from 'next/link';

export default function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('localsampark_consent');
    if (!consent) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('localsampark_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    // Under strict GDPR/DPDP, declining should still allow basic access but disable tracking
    localStorage.setItem('localsampark_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-slide-up pointer-events-none">
      <div className="max-w-4xl mx-auto bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pointer-events-auto flex flex-col md:flex-row gap-6 items-center justify-between">
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-500/30">
            <ShieldAlert className="text-blue-500" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg mb-1">Your Privacy Matters</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              We use strictly necessary cookies to ensure the core functionality of LocalSampark (like authentication and cart state). By continuing to use this platform, you agree to our <Link href="/legal" className="text-blue-400 hover:underline">Privacy Policy</Link> and <Link href="/legal" className="text-blue-400 hover:underline">Terms of Service</Link>, in compliance with the DPDP Act.
            </p>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3 shrink-0">
          <button 
            onClick={handleDecline}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Decline
          </button>
          <button 
            onClick={handleAccept}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Accept All
          </button>
        </div>

      </div>
    </div>
  );
}
