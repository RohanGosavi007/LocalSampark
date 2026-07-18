import React from 'react';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LocationProvider } from '../context/LocationContext';
import { ZoneProvider } from '../context/ZoneContext';
import { ConfigProvider } from '../context/ConfigContext';
import { SocketProvider } from '../context/SocketContext';
import { LanguageProvider } from './components/LanguageToggle';
import { ToastProvider } from './components/ui/Toast';
import ServiceWorkerRegistrar from './components/ServiceWorkerRegistrar';

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
  themeColor: '#4f46e5',
};

// Script to apply saved dark mode BEFORE hydration (prevents flash)
const themeScript = `
  try {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.body.classList.add('dark-mode');
    }
  } catch(e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <ServiceWorkerRegistrar />
        <LanguageProvider>
          <AuthProvider>
            <ZoneProvider>
              <LocationProvider>
                <ConfigProvider>
                  <SocketProvider>
                    <ToastProvider />
                    {children}
                  </SocketProvider>
                </ConfigProvider>
              </LocationProvider>
            </ZoneProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
