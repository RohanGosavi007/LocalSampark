import { NextResponse } from 'next/server';
import { makeNonce, buildCsp } from './lib/csp.mjs';

/**
 * The console's Content-Security-Policy, with a nonce for this request (P9).
 * Next.js reads the policy from the request header to stamp its own scripts;
 * the layout reads x-nonce for its theme script.
 */
export function middleware(request) {
  const nonce = makeNonce();
  const csp = buildCsp({ nonce, apiUrl: process.env.NEXT_PUBLIC_API_URL, dev: process.env.NODE_ENV !== 'production' });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
