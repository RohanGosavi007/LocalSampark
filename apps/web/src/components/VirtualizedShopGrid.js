'use client';
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ShopCard } from './ShopCard';

export function VirtualizedShopGrid({ items, categoriesMap, onQuickView }) {
  const parentRef = useRef(null);

  // Group items into rows of 3 for desktop grid layout
  const columnsCount = 3;
  const rowCount = Math.ceil(items.length / columnsCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 480, // Height estimation for each grid row
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className="h-[800px] overflow-y-auto w-full no-scrollbar pr-2"
    >
      <div
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnsCount;
          const rowItems = items.slice(startIndex, startIndex + columnsCount);

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 px-1"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              }}
            >
              {rowItems.map((shop, colIdx) => {
                const globalIndex = startIndex + colIdx;
                return (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    category={categoriesMap[shop.category_id]}
                    index={globalIndex}
                    onQuickView={onQuickView}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const MemoizedVirtualizedShopGrid = React.memo(VirtualizedShopGrid, (prev, next) => {
  return prev.items.length === next.items.length && 
         prev.items[0]?.id === next.items[0]?.id &&
         prev.categoriesMap === next.categoriesMap;
});
