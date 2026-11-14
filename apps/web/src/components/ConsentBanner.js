'use client';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import Link from 'next/link';
import { readConsent, writeConsent, OPEN_CONSENT } from '../lib/consent.mjs';

/**
 * The privacy choice (P11, DPDP Act).
 *
 * Two things are kept apart that the old banner ran together ("keep browsing
 * means you agree"): what the site needs to work (login, cart: no consent needed) and
 * product analytics (which shops and items are viewed or tapped, used to improve
 * search and ranking), which is opt-in. Not answering means no analytics.
 * "Only necessary" is as easy to press as "Allow analytics", and the footer's
 * "Privacy choices" link reopens this to change the answer at any time.
 */
export default function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [current, setCurrent] = useState('unset');

  useEffect(() => {
    setCurrent(readConsent());
    // First visit: ask, after a short pause so it does not cover the page at once.
    let timer = null;
    if (readConsent() === 'unset') timer = setTimeout(() => setIsVisible(true), 1500);

    // The footer's "Privacy choices" link.
    const reopen = () => { setCurrent(readConsent()); setIsVisible(true); };
    window.addEventListener(OPEN_CONSENT, reopen);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(OPEN_CONSENT, reopen);
    };
  }, []);

  const choose = (allow) => {
    writeConsent(allow);
    setCurrent(allow ? 'granted' : 'denied');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-slide-up pointer-events-none">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-title"
        aria-describedby="consent-text"
        className="max-w-4xl mx-auto bg-background border-2 border-border rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pointer-events-auto flex flex-col md:flex-row gap-6 items-center justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/30">
            <ShieldAlert className="text-primary" size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 id="consent-title" className="font-bold text-text text-lg mb-1">Your Privacy Matters</h3>
            <p id="consent-text" className="text-text-muted text-sm leading-relaxed">
              LocalSampark stores what it needs to work: your sign-in and your cart. With your permission it also
              measures which shops and items people view and tap, to improve search and the order of results. No name,
              phone number or address is part of that. You can change your mind at any time from &ldquo;Privacy
              choices&rdquo; at the bottom of any page. See our{' '}
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
              {current === 'granted' && <strong> Analytics are currently on.</strong>}
              {current === 'denied' && <strong> Analytics are currently off.</strong>}
            </p>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3 shrink-0">
          <button
            onClick={() => choose(false)}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold border border-border text-text-muted hover:bg-card-bg transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} aria-hidden="true" />
            Only necessary
          </button>
          <button
            onClick={() => choose(true)}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} aria-hidden="true" />
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
