import LegalHub from '../legal/LegalHub';

export const metadata = {
  title: 'Privacy Policy | LocalSampark',
  description: 'How LocalSampark collects, uses and protects your personal data, and how to export or delete it.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy Policy | LocalSampark', description: 'How LocalSampark collects, uses and protects your personal data, and how to export or delete it.', url: '/privacy', type: 'website' },
};

export default function Page() {
  return <LegalHub initialTab="privacy" />;
}
