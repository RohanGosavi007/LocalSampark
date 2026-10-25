'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The wallet is /wallet, which reads the real ledger. This page listed invented transactions
// ("Referral Bonus: Rahul") and a hard-coded balance.
export default function ResidentWalletRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/wallet'); }, [router]);
  return <p className="p-8 text-text-muted">Opening your wallet…</p>;
}
