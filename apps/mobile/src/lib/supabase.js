// Crash-safe Supabase client initialization
// Wrapped in try-catch so a failed init never crashes the app boot
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qahlydtjfypxhumixtwo.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhaGx5ZHRqZnlweGh1bWl4dHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMzU3ODksImV4cCI6MjA5ODgxMTc4OX0.evlCQSJYWBxLub9aGBbneP6JHVxJg-zZx8th0TbByio';

let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn('[Supabase] Client initialization failed (non-fatal):', e.message);
}

export { supabase };
