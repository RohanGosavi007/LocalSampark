import { NextResponse } from 'next/server';
import { featureForPath, isWebFeatureEnabled } from './lib/featureRoutes.mjs';
import { makeNonce, buildCsp } from './lib/csp.mjs';
import { API_URL } from './lib/apiUrl.js';

/**
 * Two jobs, for every page request.
 *
 * 1. Deep-link gating for modules that are off at launch (F-107).
 *    The header only hid the navigation links; a bookmarked or shared URL
 *    such as /krishi/mandi-rates still rendered the placeholder module. While
 *    a module's feature flag is off, the request is rewritten to /coming-soon,
 *    which explains that the module is not available yet and offers the
 *    pincode waitlist (POST /api/v1/gtm/interest-lead). The visitor keeps the
 *    URL.
 *
 * 2. The canonical URL (P7). The root layout used to declare
 *    `alternates.canonical: '/'`, which Next applies to every page that does
 *    not override it, so /shops, /search, /support and the rest all told
 *    search engines they were duplicates of the homepage. The request path is
 *    passed to the layout in x-ls-pathname so each page gets a
 *    self-referencing canonical.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 3. The page's Content-Security-Policy (P9), with a nonce for this
  //    request. Next.js reads it from the request header to stamp its own
  //    scripts; the layout reads x-nonce for its inline ones.
  const nonce = makeNonce();
  const csp = buildCsp({ nonce, apiUrl: API_URL, dev: process.env.NODE_ENV !== 'production' });
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  headers.set('x-ls-pathname', pathname);

  const feature = featureForPath(pathname);
  let response;
  if (feature && !isWebFeatureEnabled(feature)) {
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    url.search = '';
    url.searchParams.set('feature', feature);
    url.searchParams.set('from', pathname);
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    response = NextResponse.next({ request: { headers } });
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

// Every page, but not Next's own assets, API routes or static files.
export const config = {
  matcher: ['/((?!_next/|api/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
