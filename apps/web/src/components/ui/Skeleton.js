'use client';
import React from 'react';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-slate-800/40 via-slate-700/40 to-slate-800/40 bg-[length:200%_100%] border border-border/20 ${className}`}
      {...props}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-3xl border border-border/80 bg-background/60 p-6 shadow-xl space-y-4 backdrop-blur-xl animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-4 w-1/3 rounded-md" />
      <Skeleton className="h-8 w-2/3 rounded-lg" />
    </div>
  );
}

export function ShopCardSkeleton() {
  return (
    <div className="flex flex-col h-full border border-border/80 rounded-3xl overflow-hidden p-0 bg-background/60 backdrop-blur-xl shadow-xl animate-pulse">
      <div className="h-48 bg-card-bg/60 w-full" />
      <div className="p-6 flex flex-col flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="flex gap-2 pt-4 mt-auto">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="w-full space-y-3 p-4 bg-background/40 rounded-3xl border border-border/80 backdrop-blur-xl animate-pulse">
      <div className="h-10 bg-card-bg/60 rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-card-bg/30 rounded-xl w-full flex items-center px-4 gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
