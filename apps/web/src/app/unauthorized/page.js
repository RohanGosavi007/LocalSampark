import Link from 'next/link';

export const metadata = {
  title: 'Access denied | LocalSampark',
  description: 'You do not have access to this page.',
  robots: { index: false, follow: false },
};

// Where RoleRoute sends a signed-in person who opened a page their role cannot use.
// It used to send them to /unauthorized, which did not exist, so they got a 404.
export default function Unauthorized() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-black text-text mb-3">Access denied</h1>
        <p className="text-text-muted mb-8">
          Your account does not have access to this page. If you think it should, ask the person who manages your account.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/" className="px-6 py-3 rounded-xl bg-primary text-white font-bold">Go to home</Link>
          <Link href="/login" className="px-6 py-3 rounded-xl border border-border text-text font-bold">Switch account</Link>
        </div>
      </div>
    </main>
  );
}
