// Crash-safe Supabase client initialization.
//
// Single source of truth for the client. AuthContext used to build a second one
// from its own copy of the same literals, so the project the app talked to was
// configured in two places and could drift.
//
// Configuration resolves in this order:
//   1. EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY  — inlined by Metro at bundle time,
//      so these must be set in the *build* environment, not at runtime.
//   2. expo.extra.SUPABASE_URL / _ANON_KEY in app.json — the same mechanism
//      app.json already uses for API_URL_PROD, and the one that survives an EAS
//      build without extra env plumbing.
//
// The anon key is publishable by design (it is protected by row-level security,
// not by secrecy), so shipping it in the bundle is expected. What was wrong was
// hardcoding it as an unavoidable fallback: every build was pinned to one
// project, with no way to point a staging build at a staging instance.
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.SUPABASE_URL || null;

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.SUPABASE_ANON_KEY || null;

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Not fatal: Supabase backs realtime presence and order tracking, both of
  // which already degrade gracefully. Everything else goes through the REST API.
  console.warn(
    '[Supabase] Not configured — set EXPO_PUBLIC_SUPABASE_URL and ' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY, or expo.extra.SUPABASE_URL / ' +
    'SUPABASE_ANON_KEY in app.json. Realtime features are disabled.'
  );
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[Supabase] Client initialization failed (non-fatal):', e.message);
  }
}

export { supabase };
export default supabase;
