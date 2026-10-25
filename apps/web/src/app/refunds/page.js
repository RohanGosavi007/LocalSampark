import LegalHub from '../legal/LegalHub';

export const metadata = {
  title: 'Refund & Cancellation Policy | LocalSampark',
  description: 'When an order can be cancelled, how missing or defective items are refunded, and subscription refunds.',
  alternates: { canonical: '/refunds' },
  openGraph: { title: 'Refund & Cancellation Policy | LocalSampark', description: 'When an order can be cancelled, how missing or defective items are refunded, and subscription refunds.', url: '/refunds', type: 'website' },
};

export default function Page() {
  return <LegalHub initialTab="refunds" />;
}
