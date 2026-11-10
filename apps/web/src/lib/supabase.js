import { createClient } from '@supabase/supabase-js';

// Browser-safe Supabase client (anon key + RLS) for client components and
// Realtime subscriptions.
//
// There is deliberately no service-role client in this app. Anything in
// apps/web can end up in the browser bundle, and a service-role key bypasses
// row-level security for every table. Privileged operations go through the
// backend API (`/api/v1/*`), which holds that key server-side.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
