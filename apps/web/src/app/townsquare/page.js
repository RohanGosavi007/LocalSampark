'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The neighbourhood feed is /community. This page listed three invented posts ("Priya Mehta",
// "Rahul Sharma"), "1,204 Verified Residents" and an SOS button that did nothing.
export default function TownsquareRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/community'); }, [router]);
  return <p className="p-8 text-text-muted">Opening the community feed…</p>;
}
