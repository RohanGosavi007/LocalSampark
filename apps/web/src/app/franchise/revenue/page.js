'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FRANCHISE_REDIRECTS } from '@/lib/adminConsole.mjs';

// Placeholder retired (next.config.mjs redirects this path on the server);
// this only runs on client-side navigation.
export default function FranchiseRevenueRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace(FRANCHISE_REDIRECTS['revenue']); }, [router]);
  return <p className="p-8">Opening the franchise dashboard…</p>;
}
