'use client';
import PendingPayouts from '@/components/admin/PendingPayouts';

export default function AdminPayouts() {
  return (
    <main className="p-8 max-w-7xl mx-auto">
      <PendingPayouts title="Payout Settlement" />
    </main>
  );
}
