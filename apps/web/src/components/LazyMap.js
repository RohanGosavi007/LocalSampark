'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/Skeleton';

const InteractiveMapInternal = dynamic(() => import('./InteractiveMapInternal'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden relative border border-border bg-background shadow-inner flex flex-col items-center justify-center p-6 space-y-4">
      <Skeleton className="h-full w-full rounded-2xl" />
    </div>
  ),
});

export default function LazyMap(props) {
  return <InteractiveMapInternal {...props} />;
}
