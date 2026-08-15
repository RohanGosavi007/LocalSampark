'use client';
import React from 'react';
import { MapPin, Mail, Phone, ExternalLink } from 'lucide-react';

const LINKS = {
  'Explore': [
    { href: '/community', label: 'Community Forum' },
    { href: '/events', label: 'Local Events' },
    { href: '/shops', label: 'Shops Directory' },
    { href: '/chef', label: 'Home-Chefs' },
    { href: '/jobs', label: 'Gig Economy' },
    { href: '/properties', label: 'Real Estate' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/pets', label: 'Pet Adoption' },
  ],
  'Services': [
    { href: '/carpool', label: 'Ride Sharing & Carpool' },
    { href: '/delivery', label: 'Local Logistics' },
    { href: '/order-tracking', label: 'Order Tracking' },
    { href: '/equipment', label: 'Equipment Rentals' },
    { href: '/scrap', label: 'Scrap Collection' },
    { href: '/health', label: 'Health & Wellness' },
    { href: '/medical', label: 'Medical Directory' },
    { href: '/donations', label: 'Donations & Relief' },
  ],
  'Partnerships': [
    { href: '/franchise', label: 'Become a Franchise' },
    { href: '/register-shop', label: 'Register Your Shop' },
    { href: '/society-registration', label: 'Register Society' },
    { href: '/earn', label: 'Earn with Us' },
    { href: '/referral', label: 'Refer & Earn' },
    { href: '/premium', label: 'Sampark Premium' },
  ],
};

const STATS = [
  { v: '12.5k+', l: 'Active Users' },
  { v: '340+', l: 'Verified Shops' },
  { v: '₹7.1L', l: 'Monthly Volume' },
  { v: '25+', l: 'Pune Zones' },
];

export default function Footer() {
  return (
    <footer className="bg-background-alt border-t border-border mt-20 relative overflow-hidden">
      {/* Decorative gradient blur at bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Stats bar */}
      <div className="bg-gradient-to-r from-primary to-indigo-600 py-10 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/20">
            {STATS.map(s => (
              <div key={s.l} className="flex flex-col items-center">
                <div className="text-3xl md:text-4xl font-heading font-black text-white mb-1">{s.v}</div>
                <div className="text-sm font-medium text-white/80 uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="py-16 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
            
            {/* Brand column */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-heading font-extrabold tracking-tight text-text">
                  Local<span className="text-primary">Sampark</span>
                </h4>
              </div>
              <p className="text-text-muted leading-relaxed mb-6 text-sm">
                लोकल संपर्क — Your neighborhood, fully connected. Bridging local business, micro-delivery, events, jobs, society management, and community forums. Built in Pune for India.
              </p>

              {/* Zone badge */}
              <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live in Dhanori, Pune
              </div>

              {/* Social */}
              <div className="flex gap-3">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-background rounded-full flex items-center justify-center border border-border hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 shadow-sm hover:shadow-primary/30 text-sm font-bold">
                    FB
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-background rounded-full flex items-center justify-center border border-border hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 shadow-sm hover:shadow-primary/30 text-sm font-bold">
                    IG
                  </a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-background rounded-full flex items-center justify-center border border-border hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 shadow-sm hover:shadow-primary/30 text-sm font-bold">
                    GH
                  </a>
              </div>
            </div>

            {/* Link columns */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {Object.entries(LINKS).map(([heading, links]) => (
                <div key={heading}>
                  <h4 className="text-text font-heading font-bold text-lg mb-6">{heading}</h4>
                  <ul className="space-y-4">
                    {links.map(link => (
                      <li key={link.href}>
                        <a href={link.href} className="text-text-muted hover:text-primary text-sm font-medium transition-colors flex items-center gap-2 group">
                          <span className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors"></span>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* App Download Banner */}
          <div className="bg-gradient-to-r from-background to-border/30 border border-border rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-12 shadow-sm">
            <div>
              <h4 className="text-xl font-heading font-bold text-text mb-2">Take your neighborhood with you</h4>
              <p className="text-text-muted text-sm max-w-md">Download the LocalSampark app for exclusive deals, live order tracking, and real-time community alerts.</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto flex-wrap">
              <a href="/download" className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-text text-background px-6 py-3 rounded-xl font-semibold hover:bg-primary transition-colors hover:shadow-xl hover:shadow-primary/20">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.3414C17.523 17.5362 19.413 18.3622 19.457 18.3882C19.413 18.5912 18.735 20.8972 17.159 23.1892C15.827 25.1202 14.417 27.0502 12.015 27.0502C9.658 27.0502 8.922 25.5902 6.326 25.5902C3.729 25.5902 2.898 27.0062 0.63 27.0502C-1.815 27.0942 -3.42 24.8772 -4.795 22.9032C-7.618 18.8472 -9.511 11.5832 -6.611 6.55123C-5.169 4.05323 -2.637 2.45323 0.147 2.40923C2.418 2.36523 4.557 3.94523 5.922 3.94523C7.286 3.94523 9.873 1.94023 12.63 2.02823C13.785 2.07223 17.065 2.49823 19.231 5.67023C19.055 5.77623 15.654 7.76523 15.742 11.6632C15.829 16.2752 19.82 17.8482 19.864 17.8922C19.864 17.8922 17.523 15.3414 17.523 15.3414ZM12.001 -4.11677C13.255 -5.63277 14.118 -7.77077 13.888 -9.92477C11.979 -9.84677 9.697 -8.64777 8.399 -7.13077C7.23 -5.79577 6.208 -3.61477 6.48 -1.50377C8.618 -1.33677 10.747 -2.60077 12.001 -4.11677Z" transform="translate(9 11) scale(0.6)"/></svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider leading-none opacity-80">Download on the</div>
                  <div className="text-sm leading-none mt-1">App Store</div>
                </div>
              </a>
              <a href="/download" className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-text text-background px-6 py-3 rounded-xl font-semibold hover:bg-primary transition-colors hover:shadow-xl hover:shadow-primary/20">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 11.997L3.609 22.18C3.541 22.112 3.483 22.036 3.435 21.954C3.167 21.494 3.033 20.942 3.033 20.354V3.64C3.033 3.052 3.167 2.5 3.435 2.04C3.483 1.958 3.541 1.882 3.609 1.814ZM15.02 13.224L17.72 15.924L11.758 19.367C10.747 19.951 9.697 19.951 8.686 19.367L2.724 15.924L15.02 13.224ZM15.02 10.77L2.724 8.07L8.686 4.627C9.697 4.043 10.747 4.043 11.758 4.627L17.72 8.07L15.02 10.77ZM19.245 9.595L16.247 11.997L19.245 14.399C19.78 13.627 20.088 12.802 20.088 11.997C20.088 11.192 19.78 10.367 19.245 9.595Z"/></svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider leading-none opacity-80">GET IT ON</div>
                  <div className="text-sm leading-none mt-1">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-border">
            <div>
              <p className="text-sm font-medium text-text-muted">© {new Date().getFullYear()} LocalSampark Technologies Pvt. Ltd. Made with ❤️ in Pune.</p>
              <p className="text-xs text-text-muted/60 mt-1">CIN: U74999MH2026PTC000001 | GST: 27AABCL0000A1Z5</p>
            </div>
            <div className="flex gap-6 flex-wrap justify-center">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Security', href: '/security' }
              ].map(l => (
                <a key={l.label} href={l.href} className="text-sm font-medium text-text-muted hover:text-primary transition-colors flex items-center gap-1 group">
                  {l.label} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -mt-1" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
