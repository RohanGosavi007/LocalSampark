'use client';
import React, { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Navigation, Truck, ShieldCheck, Clock, MessageCircle } from 'lucide-react';

/**
 * Shop card — quick-commerce register.
 *
 * Rewritten against how Blinkit, Zepto and Swiggy present a browse grid. What
 * changed and why:
 *
 *   Fabricated rating. `{shop.rating || '4.5'}` advertised an unrated shop at
 *   4.5 stars. The rating is now shown only when there is one, alongside the
 *   real review count.
 *
 *   Four competing calls to action. The card carried "Quick View", "Visit
 *   Shop", a conditional "Book Dine-in" and a WhatsApp button — four choices
 *   for one decision. The whole card is now the primary target, with Quick View
 *   demoted to a secondary control that does not compete for the same tap.
 *
 *   Cost per card. TiltCard (a mousemove-driven 3D transform),
 *   `backdrop-blur-xl`, `glass-card`, a 700ms `scale-110` image transition and
 *   two `animate-pulse` badges ran on every card in the grid. That is the
 *   GPU load this repo's own category-engine review flagged as a High risk on
 *   low-end Android. A card now costs one shadow and one border transition.
 *
 *   Density. A 192px image with 24px padding and six stacked blocks fits very
 *   few shops per screen. Quick commerce is a dense medium: the tighter card
 *   roughly doubles what a phone viewport holds.
 *
 * Props are unchanged, so existing callers keep working.
 */
const ShopCardComponent = ({ shop, category, index, onQuickView }) => {
  const reduce = useReducedMotion();

  const photo = useMemo(() => {
    const raw = shop.photo_urls;
    if (!raw || raw === '[]' || raw === 'null') return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      return raw;
    }
  }, [shop.photo_urls]);

  const rating = Number(shop.rating) || 0;
  const lowStock = shop.stock_qty > 0 && shop.stock_qty <= 5;

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      // Staggered within a row only; a long list should not accumulate delay.
      transition={reduce ? { duration: 0.15 } : { delay: (index % 4) * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-commerce-hairline bg-commerce-surface shadow-commerce transition-shadow duration-200 hover:shadow-commerce-raised focus-within:ring-2 focus-within:ring-commerce-action focus-within:ring-offset-2"
    >
      {/* Image carries the colour; the chrome stays out of its way. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-commerce-sunken">
        {photo ? (
          <img
            src={photo}
            alt={shop.name || 'Shop'}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl opacity-40">
            {category?.icon || '🏪'}
          </div>
        )}

        {/* One badge at a time. Stacking PREMIUM, low-stock and verified over
            the photograph is what made the old card feel like a discount bin.
            Genuine scarcity outranks a paid placement. */}
        {lowStock ? (
          <span className="absolute left-2 top-2 rounded-md bg-commerce-urgent px-2 py-0.5 text-[11px] font-bold text-white">
            Only {shop.stock_qty} left
          </span>
        ) : shop.is_premium === 1 ? (
          <span className="absolute left-2 top-2 rounded-md bg-commerce-ink/85 px-2 py-0.5 text-[11px] font-bold text-white">
            Premium
          </span>
        ) : null}

        {shop.delivery_eta_minutes > 0 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-commerce-surface/95 px-2 py-0.5 text-[11px] font-bold text-commerce-ink">
            <Clock className="h-3 w-3" /> {shop.delivery_eta_minutes} min
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-bold leading-tight text-commerce-ink">
            {shop.name}
          </h3>
          {/* Shown only when the shop genuinely has a rating. */}
          {rating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 rounded bg-commerce-sunken px-1.5 py-0.5 text-xs font-bold tabular-nums text-commerce-ink">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {rating.toFixed(1)}
              {shop.total_ratings > 0 && (
                <span className="font-medium text-commerce-ink-muted">({shop.total_ratings})</span>
              )}
            </span>
          )}
        </div>

        <p className="line-clamp-1 text-xs text-commerce-ink-muted">
          {category?.name || 'Shop'}
          {shop.distance_km ? ` · ${shop.distance_km} km` : ''}
        </p>

        {shop.description && (
          <p className="line-clamp-1 text-xs text-commerce-ink-muted">{shop.description}</p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          {shop.delivery_available === 1 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-commerce-action">
              <Truck className="h-3 w-3" /> Delivery
            </span>
          )}
          {shop.is_verified === 1 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-commerce-ink-muted">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
          {!shop.delivery_available && !shop.is_verified && shop.distance_km && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-commerce-ink-muted">
              <Navigation className="h-3 w-3" /> {shop.distance_km} km away
            </span>
          )}
        </div>
      </div>

      {/* The card is the primary target. A stretched link keeps the whole
          surface tappable — the quick-commerce norm — while remaining a single
          real anchor for keyboard and screen-reader users. */}
      <a
        href={`/shops/${shop.id}`}
        className="absolute inset-0 z-10 focus:outline-none"
        aria-label={`View ${shop.name}`}
      >
        <span className="sr-only">View {shop.name}</span>
      </a>

      {/* Secondary actions, lifted above the stretched link so they stay
          clickable. WhatsApp is kept deliberately: copying Swiggy's single-CTA
          card wholesale would drop it, but for hyperlocal India a direct
          message to the shop is a primary conversion path, not a nicety. It is
          an icon rather than the full-width button it used to be, so it adds a
          route without competing with the card itself. */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
        {shop.phone && (
          <a
            href={`https://wa.me/${String(shop.phone).replace(/\D/g, '')}?text=${encodeURIComponent(
              `Hi ${shop.name || ''}, I found you on LocalSampark.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Message ${shop.name} on WhatsApp`}
            className="grid h-7 w-7 place-items-center rounded-md bg-commerce-surface/95 text-[#25D366] shadow-commerce transition-transform duration-150 hover:scale-105"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(shop);
            }}
            className="rounded-md bg-commerce-surface/95 px-2 py-1 text-[11px] font-bold text-commerce-ink opacity-0 shadow-commerce transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100"
          >
            Quick view
          </button>
        )}
      </div>
    </motion.article>
  );
};

export const ShopCard = memo(ShopCardComponent, (prev, next) => {
  return (
    prev.shop.id === next.shop.id &&
    prev.shop.rating === next.shop.rating &&
    prev.shop.stock_qty === next.shop.stock_qty &&
    prev.shop.is_premium === next.shop.is_premium &&
    prev.category?.id === next.category?.id &&
    prev.index === next.index
  );
});

export default ShopCard;
