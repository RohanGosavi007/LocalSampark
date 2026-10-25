'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Society administration lives in /society (members, notices, bills, complaints, visitors), where the
// signed-in admin sees their own society. This page held a fixed member table ("Rahul Sharma").
export default function SocietyAdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/society'); }, [router]);
  return <p className="p-8 text-text-muted">Opening society management…</p>;
}
