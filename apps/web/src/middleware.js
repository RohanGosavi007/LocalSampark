import { NextResponse } from 'next/server';
import { featureForPath, isWebFeatureEnabled } from './lib/featureRoutes.mjs';

/**
 * Deep-link gating for modules that are off at launch (F-107).
 *
 * The header only hid the navigation links; a bookmarked or shared URL such
 * as /krishi/mandi-rates still rendered the placeholder module. While a
 * module's feature flag is off, the request is rewritten to /coming-soon,
 * which explains that the module is not available yet and offers the pincode
 * waitlist (POST /api/v1/gtm/interest-lead). The visitor keeps the URL.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const feature = featureForPath(pathname);
  if (!feature || isWebFeatureEnabled(feature)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/coming-soon';
  url.search = '';
  url.searchParams.set('feature', feature);
  url.searchParams.set('from', pathname);
  return NextResponse.rewrite(url);
}

// Static list required by Next.js; keep in step with GATED_ROUTE_PREFIXES.
export const config = {
  matcher: [
    '/krishi/:path*', '/carpool/:path*', '/jobs/:path*', '/properties/:path*', '/real-estate/:path*',
    '/medical/:path*', '/health/:path*', '/sos-dashboard/:path*', '/scrap/:path*', '/chef/:path*',
    '/equipment/:path*', '/events/:path*', '/townsquare/:path*', '/donations/:path*', '/volunteer/:path*',
    '/pets/:path*', '/premium/:path*', '/subscriptions/:path*', '/wallet/:path*', '/earn/:path*',
    '/rewards/:path*', '/society/:path*', '/society-admin/:path*', '/society-admin-dashboard/:path*',
    '/society-registration/:path*', '/resident/:path*', '/gatekeeper/:path*', '/security-dashboard/:path*',
  ],
};
