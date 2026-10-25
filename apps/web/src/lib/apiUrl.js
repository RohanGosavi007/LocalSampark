/**
 * Where the API is. No 'use client' here on purpose: server components (the SEO
 * zone pages) need this value and cannot get a plain string out of a client module.
 * lib/api.js re-exports it for everything else.
 */

// Base API URL — uses environment variable, falls back to localhost:5000 in dev, or render in prod
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Two deploy targets disagreed about what NEXT_PUBLIC_API_URL means.
 *
 *   render.yaml   passes RENDER_EXTERNAL_URL — an origin, no path.
 *   vercel.json   passes "https://localsampark-api.onrender.com/api/v1".
 *
 * This file then appended "/api/v1" unconditionally, so a Vercel deploy called
 * https://…/api/v1/api/v1/shops and every request 404'd. apps/mobile has the
 * opposite convention again (its API_BASE is the full base, including the
 * version segment), so there was no single reading of the variable that worked
 * everywhere.
 *
 * Rather than pick a convention and hope every deploy target is updated to
 * match, accept either: strip a trailing /api/v1 (and any trailing slash)
 * before appending it. Both settings now resolve to the same base.
 */
function toOrigin(value) {
  if (!value) return null;
  return value.replace(/\/+$/, '').replace(/\/api\/v\d+$/, '');
}

export const API_URL =
  toOrigin(process.env.NEXT_PUBLIC_API_URL) ||
  (isDev ? 'http://localhost:5000' : 'https://localsampark-api.onrender.com');
export const API_BASE = `${API_URL}/api/v1`;
