import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// For client-side components and Realtime subscriptions
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For backend API routes only (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;
