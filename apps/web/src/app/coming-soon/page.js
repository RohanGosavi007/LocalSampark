import Header from '../components/Header';
import Footer from '../components/Footer';
import WaitlistForm from './WaitlistForm';
import { featureName, featureDescription, GATED_ROUTE_PREFIXES } from '@/lib/featureRoutes.mjs';

export const metadata = {
  title: 'Coming soon | LocalSampark',
  robots: { index: false, follow: false },
};

const KNOWN_FEATURES = new Set(Object.values(GATED_ROUTE_PREFIXES));

/**
 * Served (via src/middleware.js) in place of any module that is off at launch.
 * Says plainly that the module is not available yet and lets the visitor join
 * the waitlist for their pincode.
 */
export default async function ComingSoonPage({ searchParams }) {
  const params = (await searchParams) || {};
  const raw = typeof params.feature === 'string' ? params.feature : '';
  const feature = KNOWN_FEATURES.has(raw) ? raw : null;
  const name = feature ? featureName(feature) : 'This module';
  const description = feature ? featureDescription(feature) : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '7rem 1rem 4rem' }}>
        <div className="container" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <span className="badge badge-secondary" style={{ marginBottom: '1.25rem', display: 'inline-block' }}>Coming soon</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 800, marginBottom: '1rem' }}>
            {name} is not available yet
          </h1>
          {description && (
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{description}.</p>
          )}
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            LocalSampark is starting with neighbourhood shops in Dhanori, Pune (411015). Leave your
            pincode and we will let you know when this opens in your area.
          </p>
          <WaitlistForm feature={feature || 'unknown_module'} />
          <p style={{ marginTop: '2rem' }}>
            <a href="/shops" className="btn btn-secondary">Browse local shops</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
