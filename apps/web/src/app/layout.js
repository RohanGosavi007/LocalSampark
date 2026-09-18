import React from 'react';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LocationProvider } from '../context/LocationContext';
import { ZoneProvider } from '../context/ZoneContext';
import { ConfigProvider } from '../context/ConfigContext';
import { SocketProvider } from '../context/SocketContext';
import { LanguageProvider } from './components/LanguageToggle';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ServiceWorkerRegistrar from './components/ServiceWorkerRegistrar';
import DevLoginScreen from '../components/DevLoginScreen';
import QueryProvider from './components/QueryProvider';
import ConsentBanner from '../components/ConsentBanner';
import WelcomeTour from '../components/WelcomeTour';
import PageTransition from '../components/motion/PageTransition';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LocalSampark',
  alternateName: 'लोकल संपर्क',
  url: 'https://localsampark.com',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web, Android',
  description: 'Hyperlocal super-app connecting neighborhoods with local shops, services, carpools, community forums, and delivery.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '12450' },
  author: { '@type': 'Organization', name: 'LocalSampark', url: 'https://localsampark.com' },
  areaServed: { '@type': 'City', name: 'Pune', '@id': 'https://www.wikidata.org/wiki/Q1538' },
};

export const metadata = {
  title: 'LocalSampark — Your Neighborhood, Connected',
  description: 'LocalSampark (लोकल संपर्क) brings neighborhood discussions, local shops, gig jobs, properties, and community events directly into your hands. Pilot running in Dhanori, Pune.',
  keywords: 'hyperlocal, pune, dhanori, local delivery, neighborhood, community, society management, carpool',
  authors: [{ name: 'LocalSampark' }],
  manifest: '/manifest.json',
  openGraph: {
    title: 'LocalSampark — Your Neighborhood, Connected',
    description: 'The ultimate hyperlocal app for your community.',
    url: 'https://localsampark.com',
    siteName: 'LocalSampark',
    images: [
      {
        url: 'https://localsampark.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'LocalSampark Banner',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LocalSampark',
    description: 'Your Neighborhood, Connected',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // One value, not a media-query pair: the browser chrome should follow the
  // user's in-app choice, not the OS, so applyTheme() rewrites this meta tag
  // whenever the theme changes. #4f46e5 was an indigo that matched neither
  // the old palette nor the new one.
  themeColor: '#F6F8FB',
};

// Applies the stored theme before first paint, so there is no flash of the
// wrong palette. This must stay in step with applyTheme() in
// contexts/ThemeContext.js — it writes the same three markers, on the same
// elements, from the same localStorage key.
//
// It runs in <head> and touches only documentElement, because <body> does not
// exist yet at that point; the provider adds the body classes on mount and the
// CSS matches on either selector, so nothing flashes in between.
const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem('theme');
      var pref = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
      var resolved = pref === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : pref;
      var root = document.documentElement;
      root.classList.toggle('dark', resolved === 'dark');
      root.setAttribute('data-theme', resolved);
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run before the first paint, and before any stylesheet applies,
            or the page flashes the wrong palette on every load. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        for(let registration of registrations) {
                          registration.unregister();
                          console.log('Unregistered stale ServiceWorker in dev mode');
                        }
                      });
                    } else {
                      navigator.serviceWorker.register('/sw.js').then(function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                      });
                    }
                  });
                }
              `,
            }}
          />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <ServiceWorkerRegistrar />
          {/* SocketProvider, ConfigProvider and ToastProvider were all imported
              at the top of this file and never rendered.

              The consequences were not cosmetic. ToastProvider renders
              react-hot-toast's <Toaster>, so all 33 files that call toast()
              were writing to a surface that did not exist — every success and
              error notification in the app was silent. SocketProvider is the
              app's shared realtime connection; with it unmounted, useSocket()
              had no value to return, and nine pages had each grown their own
              ad-hoc io() connection instead.

              ToastProvider is a sibling, not a wrapper: it renders <Toaster />
              and takes no children. */}
          <QueryProvider>
            <ThemeProvider>
              <ConfigProvider>
                <AuthProvider>
                  <SocketProvider>
                    <ZoneProvider>
                      <LocationProvider>
                        <PageTransition>
                          {children}
                        </PageTransition>
                        <ToastProvider />
                        <ConsentBanner />
                        <WelcomeTour />
                        <DevLoginScreen />
                      </LocationProvider>
                    </ZoneProvider>
                  </SocketProvider>
                </AuthProvider>
              </ConfigProvider>
            </ThemeProvider>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
