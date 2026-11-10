'use client';
import { useEffect } from 'react';
import { adminConsoleUrl } from '@/lib/adminConsole.mjs';

/**
 * Client-side fallback for /admin-dashboard modules that live in the dedicated
 * admin console. next.config.mjs already redirects these paths on the server;
 * this only runs if that redirect was bypassed (e.g. client-side navigation
 * from the sidebar).
 */
export default function AdminConsoleRedirect({ moduleKey, title }) {
  const target = adminConsoleUrl(moduleKey);
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold mb-2">{title} has moved</h1>
      <p className="text-slate-500 mb-4">This module is managed in the LocalSampark admin console.</p>
      <a className="text-blue-600 underline" href={target}>Open the admin console</a>
    </div>
  );
}
