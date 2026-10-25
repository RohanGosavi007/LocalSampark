import LegalHub from './LegalHub';

export const metadata = {
  title: 'Legal & Compliance | LocalSampark',
  description: 'LocalSampark terms of service, privacy policy and refund policy.',
  alternates: { canonical: '/legal' },
};

export default async function Page({ searchParams }) {
  const { tab } = (await searchParams) || {};
  return <LegalHub initialTab={tab} />;
}
