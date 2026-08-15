'use client';
import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Navigation, Truck, ShieldCheck, Eye } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { WhatsAppChatButton } from './ui/WhatsAppChatButton';
import TiltCard from './motion/TiltCard';

const ShopCardComponent = ({ shop, category, index, onQuickView }) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      // Reveal on entering the viewport rather than on mount. Previously this
      // used `animate`, so every card below the fold completed its reveal while
      // off-screen and was already visible when scrolled to.
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              // Stagger within a row, not across the whole list: capping the
              // old delay at 0.3s made every card past the tenth fire together.
              delay: (index % 3) * 0.07,
              duration: 0.55,
              ease: [0.16, 1, 0.3, 1],
            }
      }
      className="h-full"
    >
    <TiltCard
      maxTilt={7}
      scale={1.02}
      radius="rounded-3xl"
      className="glass-card hover:shadow-2xl hover:shadow-primary/20 transition-shadow duration-300 flex flex-col h-full border border-white/20 dark:border-white/10 backdrop-blur-xl bg-white/70 dark:bg-background/70 overflow-hidden group"
    >
      {shop.is_premium === 1 && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-black px-3.5 py-1 rounded-full text-xs font-black z-10 shadow-lg shadow-amber-500/30 flex items-center gap-1.5 backdrop-blur-md">
          <Star className="w-3.5 h-3.5 fill-black animate-pulse" /> PREMIUM
        </div>
      )}

      {/* 10x Low Stock Urgency Badge */}
      {shop.stock_qty <= 5 && shop.stock_qty > 0 && (
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-extrabold z-10 shadow-md animate-pulse">
          🔥 Only {shop.stock_qty} left in stock!
        </div>
      )}

      <div className="h-48 bg-background relative overflow-hidden flex items-center justify-center">
        {shop.photo_urls && shop.photo_urls !== '[]' && shop.photo_urls !== 'null' ? (
          <img
            src={
              (() => {
                try {
                  const parsed = JSON.parse(shop.photo_urls);
                  return Array.isArray(parsed) ? parsed[0] : parsed;
                } catch (e) {
                  return shop.photo_urls;
                }
              })()
            }
            alt={shop.name || 'Shop'}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
            <span className="text-6xl opacity-50 group-hover:scale-110 transition-transform duration-500">
              {category?.icon || '🏪'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
            {category?.name || 'Shop'}
          </Badge>
          <div className="flex items-center gap-1 text-sm font-bold bg-background px-2 py-1 rounded-md shadow-sm border border-border">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {shop.rating || '4.5'}
          </div>
        </div>

        <h3 className="text-xl font-heading font-bold mb-1 text-text group-hover:text-primary transition-colors line-clamp-1">
          {shop.name}
        </h3>
        <p className="text-sm text-text-muted font-medium mb-3 flex items-center gap-1">
          <Navigation className="w-3 h-3" /> {shop.distance_km ? `${shop.distance_km} km away` : 'Nearby'}
        </p>

        <p className="text-sm text-text-muted flex-1 line-clamp-2 mb-6">{shop.description}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {shop.delivery_available === 1 && (
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 bg-green-500/5 py-1">
              <Truck className="w-3 h-3 mr-1" /> Delivery
            </Badge>
          )}
          {shop.is_verified === 1 && (
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 bg-blue-500/5 py-1">
              <ShieldCheck className="w-3 h-3 mr-1" /> Verified
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border">
          {(category?.slug?.includes('restaurant') || category?.slug?.includes('food') || category?.slug?.includes('cafe')) && (
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 border-orange-500" asChild>
              <a href={`/dine-in?shopId=${shop.id}`}>🍽️ Book Dine-in</a>
            </Button>
          )}
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => onQuickView(shop)} className="flex-1" icon={Eye}>
              Quick View
            </Button>
            <Button className="flex-1 shadow-md shadow-primary/20" asChild>
              <a href={`/shops/${shop.id}`}>Visit Shop</a>
            </Button>
          </div>
          {shop.phone && (
            <div className="mt-3">
              <WhatsAppChatButton phoneNumber={shop.phone} shopName={shop.name} />
            </div>
          )}
        </div>
      </div>
    </TiltCard>
    </motion.div>
  );
};

export const ShopCard = memo(ShopCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.shop.id === nextProps.shop.id &&
    prevProps.shop.rating === nextProps.shop.rating &&
    prevProps.shop.is_premium === nextProps.shop.is_premium &&
    prevProps.category?.id === nextProps.category?.id &&
    prevProps.index === nextProps.index
  );
});
