'use client';
import React from 'react';
import {
  Store, ShoppingBag, Wrench, ChefHat, Leaf, Car, Truck,
  Building2, Home, Receipt, CalendarDays, MessageSquare, Briefcase,
  Building, HandCoins, Gift, Crown, Wallet, HeartPulse, Stethoscope,
  HeartHandshake, Dog, Package, ArrowRight,
} from 'lucide-react';
import { useLanguage } from './LanguageToggle';

/**
 * The map of what LocalSampark actually is.
 *
 * The audit's central finding about the front door: this platform runs ~24
 * consumer verticals and 11 role dashboards, and a first-time visitor could see
 * none of it. The landing page opened on a hero, a download button and three
 * stats — a delivery-app first impression — with the six-pillar bento grid
 * sitting below the fold behind three stacked overlays. Every successful Indian
 * super-app (PhonePe, Paytm, Swiggy) puts a compact, labelled, scannable map of
 * its verticals in the first viewport instead.
 *
 * Three design decisions worth knowing:
 *
 * 1. Grouped, not listed. 24 undifferentiated tiles is a wall. Three named
 *    clusters — "Shop & order", "Home & society", "Community & earn" — let
 *    someone find their reason for being here in one pass, and each cluster
 *    header states the value proposition in one line.
 *
 * 2. Flat surfaces, not glass. This is the dense commerce register, not the
 *    expressive one: no gradient fills, no backdrop-blur, no ambient motion.
 *    The repo's own tailwind.config.js flags the mesh and blur work as a "High
 *    performance risk on the low-end Android hardware this app targets", and a
 *    scannable grid is exactly where that cost buys nothing.
 *
 * 3. Every tile is a real route. Each href below was checked against
 *    apps/web/src/app — a map that promises a feature and 404s is worse than no
 *    map. /home-services has no route, so home services point at /services.
 */

const CLUSTERS = [
  {
    id: 'commerce',
    title: 'Shop & order',
    blurb: 'Everything within 3km — from the kirana downstairs to a plumber this afternoon.',
    items: [
      { label: 'Local shops', href: '/shops', Icon: Store, note: 'Kirana, pharmacy, bakery' },
      { label: 'Marketplace', href: '/marketplace', Icon: ShoppingBag, note: 'Buy and sell nearby' },
      { label: 'Home services', href: '/services', Icon: Wrench, note: 'Plumber, electrician, maid' },
      { label: 'Home chefs', href: '/chef', Icon: ChefHat, note: 'Tiffin and home food' },
      { label: 'Farm fresh', href: '/krishi', Icon: Leaf, note: 'Direct from growers' },
      { label: 'Delivery', href: '/delivery', Icon: Truck, note: 'Track a live order' },
    ],
  },
  {
    id: 'society',
    title: 'Home & society',
    blurb: 'Run your building — visitors, dues, complaints and amenities in one place.',
    items: [
      { label: 'My society', href: '/society', Icon: Building2, note: 'Gate, notices, amenities' },
      { label: 'My flat', href: '/resident', Icon: Home, note: 'Visitors and guest passes' },
      { label: 'Bills & dues', href: '/bills', Icon: Receipt, note: 'Maintenance and utilities' },
      { label: 'Carpool', href: '/carpool', Icon: Car, note: 'Share the commute' },
      { label: 'Health desk', href: '/health', Icon: HeartPulse, note: 'Emergency and first aid' },
      { label: 'Clinics', href: '/medical', Icon: Stethoscope, note: 'Doctors and diagnostics' },
    ],
  },
  {
    id: 'community',
    title: 'Community & earn',
    blurb: 'The neighbourhood itself — neighbours, events, work, and a way to make money locally.',
    items: [
      { label: 'Townsquare', href: '/community', Icon: MessageSquare, note: 'Ask, sell, alert' },
      { label: 'Events', href: '/events', Icon: CalendarDays, note: 'Meetups and drives' },
      { label: 'Local jobs', href: '/jobs', Icon: Briefcase, note: 'Gigs and full-time' },
      { label: 'Properties', href: '/properties', Icon: Building, note: 'Rent and resale' },
      { label: 'Earn with us', href: '/earn', Icon: HandCoins, note: 'Deliver, refer, partner' },
      { label: 'Wallet', href: '/wallet', Icon: Wallet, note: 'Pay and get paid' },
    ],
  },
];

/** A fourth row of smaller entries, so the grid above stays at six per cluster. */
const ALSO = [
  { label: 'Pet care', href: '/pets', Icon: Dog },
  { label: 'Elder care', href: '/care', Icon: HeartHandshake },
  { label: 'Donations', href: '/donations', Icon: Gift },
  { label: 'Equipment hire', href: '/equipment', Icon: Package },
  { label: 'SamparkPlus', href: '/premium', Icon: Crown },
];

function Tile({ label, href, note, Icon }) {
  return (
    <a
      href={href}
      // min-h in tokens, not a magic number: the audit measured 63-93% of
      // interactive elements on the live site below the 44px floor.
      className="group flex items-start gap-3 p-4 min-h-[var(--tap-comfortable)]
        rounded-[var(--radius-sm)]
        bg-[color:var(--surface-1)] border border-[color:var(--line)]
        hover:border-[color:var(--line-accent)] hover:bg-[color:var(--accent-quiet)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]
        focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ground)]
        transition-colors"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-10 h-10 grid place-items-center rounded-[var(--radius-sm)]
          bg-[color:var(--accent-quiet)] text-[color:var(--accent-text)]"
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block font-heading font-semibold text-[color:var(--ink)] leading-snug">
          {label}
        </span>
        {note && (
          <span className="block text-sm text-[color:var(--ink-muted)] leading-snug mt-0.5">
            {note}
          </span>
        )}
      </span>
    </a>
  );
}

export default function PlatformMap({ compact = false, heading, children }) {
  const { t } = useLanguage();

  return (
    <section
      id="platform-map"
      aria-labelledby="platform-map-title"
      className={compact ? 'py-8' : 'py-14 lg:py-20'}
    >
      <div className="container">
        {!compact && (
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--accent-text)] mb-3">
              One app, your whole neighbourhood
            </p>
            <h2
              id="platform-map-title"
              className="text-3xl lg:text-4xl font-heading font-black text-[color:var(--ink)] mb-3"
            >
              {heading || 'Everything LocalSampark does'}
            </h2>
            <p className="text-lg text-[color:var(--ink-muted)] leading-relaxed">
              Not one service — twenty-plus, all inside a 3km radius. Pick the one you came for.
            </p>
          </div>
        )}

        {compact && (
          <h2
            id="platform-map-title"
            className="text-xl font-heading font-bold text-[color:var(--ink)] mb-5"
          >
            {heading || 'Explore LocalSampark'}
          </h2>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {CLUSTERS.map((cluster) => (
            <div
              key={cluster.id}
              className="rounded-[var(--radius)] border border-[color:var(--line)]
                bg-[color:var(--ground-alt)] p-5 lg:p-6"
            >
              <h3 className="font-heading font-bold text-lg text-[color:var(--ink)]">
                {cluster.title}
              </h3>
              {!compact && (
                <p className="text-sm text-[color:var(--ink-muted)] leading-relaxed mt-1 mb-5">
                  {cluster.blurb}
                </p>
              )}
              <div className={`grid gap-3 ${compact ? 'mt-4' : ''} sm:grid-cols-2 lg:grid-cols-1`}>
                {cluster.items.map((item) => (
                  <Tile key={item.href} {...item} note={compact ? null : item.note} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* The long tail, deliberately quieter. Present so the map is honest
            about the platform's full surface, small so it does not compete with
            the three clusters someone actually came for. */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[color:var(--ink-muted)] mr-1">Also here:</span>
          {ALSO.map(({ label, href, Icon }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-2 px-3 min-h-[var(--tap-min)]
                rounded-full border border-[color:var(--line)] bg-[color:var(--surface-1)]
                text-sm font-medium text-[color:var(--ink-muted)]
                hover:text-[color:var(--ink)] hover:border-[color:var(--line-accent)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]
                transition-colors"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </a>
          ))}
          <a
            href="/features"
            className="inline-flex items-center gap-1.5 px-3 min-h-[var(--tap-min)]
              text-sm font-semibold text-[color:var(--accent-text)]
              hover:underline focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[color:var(--accent)] rounded-full"
          >
            See all features <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>

        {children}
      </div>
    </section>
  );
}

export { CLUSTERS, ALSO };

/**
 * The compact rail.
 *
 * The full map needs a screenful; the hero legitimately owns the first one. So
 * the breadth of the platform also appears as a single scannable strip directly
 * under the hero's CTAs — the pattern Swiggy uses, where a location-and-search
 * header is followed immediately by a rail of labelled vertical entry points.
 *
 * It replaces the hero's "0% / 2hrs / 25+" micro-stats, which repeated three of
 * the four counters in the stats ticker further down the same page and told a
 * first-time visitor nothing about what the app does.
 *
 * Horizontally scrollable on phones with snap points, wrapped on desktop. No
 * gradients or blur: this sits over an animated mesh background already, and
 * stacking more translucency on top is what makes low-end Android drop frames.
 */
export function PlatformRail({ className = '' }) {
  const items = [
    ...CLUSTERS[0].items.slice(0, 4),
    ...CLUSTERS[1].items.slice(0, 3),
    ...CLUSTERS[2].items.slice(0, 3),
  ];

  return (
    <nav
      aria-label="Jump to a service"
      className={`pt-6 border-t border-[color:var(--line)] ${className}`}
    >
      <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--ink-muted)] mb-4">
        All of this, in one app
      </p>
      <ul
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2
          lg:flex-wrap lg:overflow-visible
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ label, href, Icon }) => (
          <li key={href} className="snap-start shrink-0">
            <a
              href={href}
              className="flex items-center gap-2 px-3.5 min-h-[var(--tap-min)]
                rounded-full bg-[color:var(--surface-1)] border border-[color:var(--line)]
                text-sm font-semibold text-[color:var(--ink)]
                hover:border-[color:var(--line-accent)] hover:bg-[color:var(--accent-quiet)]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2
                focus-visible:ring-offset-[color:var(--ground)]
                transition-colors whitespace-nowrap"
            >
              <Icon className="w-4 h-4 text-[color:var(--accent-text)]" aria-hidden="true" />
              {label}
            </a>
          </li>
        ))}
        <li className="snap-start shrink-0">
          <a
            href="#platform-map"
            className="flex items-center gap-1.5 px-3.5 min-h-[var(--tap-min)]
              rounded-full text-sm font-bold text-[color:var(--accent-text)]
              hover:underline focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[color:var(--accent)] whitespace-nowrap"
          >
            + 14 more <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </nav>
  );
}
