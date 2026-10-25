'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// /tracking?order_id=… is the address older links and notifications use. It started every order
// at "accepted" whatever its real state, and waited for status names ("dispatched") the server
// never sends. Order tracking now lives in one place, /order-tracking, which reads the order.
function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const id = params.get('order_id') || params.get('id');
    router.replace(id ? `/order-tracking?id=${encodeURIComponent(id)}` : '/order-tracking');
  }, [router, params]);
  return <p className="p-8 text-text-muted">Opening your order…</p>;
}

export default function TrackingPage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
