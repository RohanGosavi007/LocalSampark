import { NextResponse } from 'next/server';
import { featureForPath, isWebFeatureEnabled } from './lib/featureRoutes.mjs';

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
  const feature = featureForPath(pathname);
  if (feature && !isWebFeatureEnabled(feature)) {
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    url.search = '';
    url.searchParams.set('feature', feature);
    url.searchParams.set('from', pathname);
    return NextResponse.rewrite(url);
  }

  const headers = new Headers(request.headers);
  headers.set('x-ls-pathname', pathname);
  return NextResponse.next({ request: { headers } });
}

// Every page, but not Next's own assets, API routes or static files.
export const config = {
  matcher: ['/((?!_next/|api/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
