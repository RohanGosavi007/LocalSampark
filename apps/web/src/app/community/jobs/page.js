'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The jobs board is /jobs, backed by the jobs API. This page listed three invented openings
// ("Balaji SuperMart", "Apollo Pharmacy") and its "post a job" form only showed a confirmation.
export default function CommunityJobsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/jobs'); }, [router]);
  return <p className="p-8 text-text-muted">Opening the jobs board…</p>;
}
