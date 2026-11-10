'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useLanguage } from '../../components/LanguageToggle';
import { RURAL_CATEGORIES, TOP_FEATURES } from '../../data/rural-services';
import WaitlistForm from '../../coming-soon/WaitlistForm';
import { apiGet } from '@/lib/api';

/** Finds a Krishi sub-module and its category in the shared catalogue (data/rural-services.js). */
function lookup(slug) {
  for (const cat of RURAL_CATEGORIES) {
    const feature = (cat.features || []).find((f) => f.id === slug);
    if (feature) return { feature, category: cat };
  }
  const top = TOP_FEATURES.find((f) => f.id === slug);
  return { feature: top || null, category: null };
}

const humanise = (slug) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * One Krishi sub-module (/krishi/<slug>).
 *
 * The 121 sub-pages were copies of one card announcing that each module "has
 * been successfully integrated" with "Super Admin configurations ... active",
 * which was not true of any of them. They now render this component, which
 * says what the module is (from the shared catalogue and translations), states
 * plainly that it is not live yet, takes a waitlist sign-up for that specific
 * module (POST /gtm/interest-lead, feature_key "krishi:<slug>") and shows the
 * real Krishi listings that are live (GET /krishi/listings).
 *
 * The whole /krishi section is served only while the krishi feature flag is
 * on; otherwise src/middleware.js shows the Coming Soon page instead.
 */
export default function KrishiModulePage({ slug }) {
  const lang = useLanguage();
  const t = (key, fallback) => {
    const value = lang && key ? lang.t(key) : null;
    return value && value !== key ? value : fallback;
  };
  const { feature, category } = lookup(slug);
  const title = t(feature && feature.title_key, humanise(slug));
  const description = t(feature && feature.desc_key, '');
  const categoryName = category ? t(category.title_key, humanise(category.id)) : null;

  const [listings, setListings] = useState([]);
  const [state, setState] = useState('loading');
  useEffect(() => {
    let cancelled = false;
    apiGet('/krishi/listings?limit=6')
      .then((d) => { if (!cancelled) { setListings(d.listings || []); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl mx-auto px-4">
          <nav aria-label="Breadcrumb" className="text-sm text-text-muted mb-4">
            <Link href="/krishi" className="underline">Krishi</Link>
            {categoryName && <> / <span>{categoryName}</span></>}
          </nav>

          <div className="bg-card-bg border border-border rounded-3xl p-6 sm:p-10 mb-8">
            <div className="text-4xl mb-3" aria-hidden="true">{feature ? feature.icon : '🌾'}</div>
            <h1 className="text-3xl font-black text-text mb-3">{title}</h1>
            {description && <p className="text-text-muted mb-6">{description}</p>}
            <p className="text-sm font-semibold text-amber-700 bg-amber-500/10 rounded-xl px-4 py-3 mb-6">
              This service is not available yet. Leave your pincode and we will tell you when it opens near you.
            </p>
            <WaitlistForm feature={`krishi:${slug}`} />
          </div>

          <section aria-labelledby="live-h">
            <h2 id="live-h" className="text-xl font-bold text-text mb-4">Live Krishi listings</h2>
            {state === 'loading' && <div className="h-24 rounded-2xl bg-card-bg border border-border animate-pulse" aria-busy="true" />}
            {state === 'error' && <p className="text-text-muted" role="alert">Listings could not be loaded right now.</p>}
            {state === 'ready' && listings.length === 0 && <p className="text-text-muted">No listings yet.</p>}
            {state === 'ready' && listings.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listings.map((l) => (
                  <li key={l.id} className="p-4 rounded-2xl bg-card-bg border border-border">
                    <p className="font-semibold text-text">{l.title}</p>
                    <p className="text-sm text-text-muted capitalize">
                      {l.type || 'listing'}
                      {l.price !== null && l.price !== undefined && l.price !== '' ? ` · ₹${l.price}` : ''}
                      {l.verified_farmer ? ' · Verified farmer' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
