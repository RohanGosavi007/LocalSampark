'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The fleet view is /admin-dashboard/logistics/map, which reads the real delivery agents. This page
// fell back to three invented riders ("Rahul Verma — battery 82%") whenever the request failed, and
// its pause button only changed the screen.
export default function DeliveryMonitorRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin-dashboard/logistics/map'); }, [router]);
  return <p className="p-8">Opening the delivery fleet…</p>;
}
