'use client';
import React from 'react';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-border/40 ${className}`}
      {...props}
    />
  );
}

export function ShopCardSkeleton() {
  return (
    <div className="glass-card flex flex-col h-full border border-border rounded-3xl overflow-hidden p-0 animate-pulse">
      <div className="h-48 bg-border/40 w-full" />
      <div className="p-6 flex flex-col flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="flex gap-2 pt-4 mt-auto">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
