'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Order history lives at /order-tracking, which reads the signed-in customer's real orders. This
// page held three invented orders ("Balaji SuperMart", "Apollo Pharmacy") with a rating form
// that sent nothing.
export default function ResidentOrdersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/order-tracking'); }, [router]);
  return <p className="p-8 text-text-muted">Opening your orders…</p>;
}
