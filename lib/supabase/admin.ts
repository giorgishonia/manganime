import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'; // Added safe fallback

if (!url || !serviceKey || serviceKey === 'placeholder-key') {
  console.warn('Supabase admin env vars missing – using placeholder key. Functionality depending on admin privileges will fail at runtime without proper keys.');
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) 