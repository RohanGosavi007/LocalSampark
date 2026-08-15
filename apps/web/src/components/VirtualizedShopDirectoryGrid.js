import React, { memo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Star, MapPin, Clock, ArrowRight } from 'lucide-react';

// Memoized Shop Card Component
const ShopCard = memo(({ shop, style }) => {
  return (
    <div style={style} className="p-2">
      <div className="bg-background border border-border hover:border-emerald-500/50 rounded-xl p-4 h-full flex flex-col justify-between transition-all group shadow-md hover:shadow-emerald-500/5">
        <div>
          {/* Header Banner & Logo */}
          <div className="relative h-24 rounded-lg bg-background overflow-hidden mb-3">
            {shop.bannerUrl ? (
              <img
                src={shop.bannerUrl}
                alt={shop.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800" />
            )}
            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              shop.categoryType === 'PRODUCT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              shop.categoryType === 'APPOINTMENT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {shop.categoryType}
            </span>
          </div>

          {/* Shop Title & Category */}
          <h3 className="font-bold text-text text-sm truncate group-hover:text-emerald-400 transition-colors">
            {shop.name}
          </h3>
          <p className="text-xs text-text-muted mt-0.5 flex items-center justify-between">
            <span>{shop.category?.name || 'General'}</span>
            <span className="flex items-center text-amber-400 text-[11px] font-semibold">
              <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
              {shop.rating} ({shop.totalRatings})
            </span>
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-3 pt-2 border-t border-border/80 flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center truncate max-w-[120px]">
            <MapPin className="w-3 h-3 mr-1 shrink-0 text-text-muted" />
            {shop.locality}
          </span>
          <span className="flex items-center text-emerald-400 font-medium">
            <Clock className="w-3 h-3 mr-1 shrink-0" />
            {shop.estimatedDeliveryTime || '30-45 mins'}
          </span>
        </div>
      </div>
    </div>
  );
});

ShopCard.displayName = 'ShopCard';

export default function VirtualizedShopDirectoryGrid({ shops = [] }) {
  if (!shops || shops.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="text-text-muted text-sm">No shops found for this pincode filter.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[650px]">
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = width > 1024 ? 3 : width > 640 ? 2 : 1;
          const columnWidth = width / columnCount;
          const rowCount = Math.ceil(shops.length / columnCount);
          const rowHeight = 220;

          const Cell = ({ columnIndex, rowIndex, style }) => {
            const index = rowIndex * columnCount + columnIndex;
            if (index >= shops.length) return null;
            return <ShopCard shop={shops[index]} style={style} />;
          };

          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
}
