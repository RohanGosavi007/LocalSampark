import LegalHub from '../legal/LegalHub';

export const metadata = {
  title: 'Terms of Service | LocalSampark',
  description: 'The terms for using LocalSampark: orders and deliveries, society management and the gate, and your account.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms of Service | LocalSampark', description: 'The terms for using LocalSampark: orders and deliveries, society management and the gate, and your account.', url: '/terms', type: 'website' },
};

export default function Page() {
  return <LegalHub initialTab="terms" />;
}
