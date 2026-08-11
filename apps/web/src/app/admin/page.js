import { redirect } from 'next/navigation';

export default function AdminRedirect() {
  // Permanently redirect the legacy /admin route to the full God Mode UI at /admin-dashboard
  redirect('/admin-dashboard');
}
