import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

function isValidHttpUrl(stringUrl) {
  if (!stringUrl || typeof stringUrl !== 'string') return false;
  const trimmed = stringUrl.trim();
  if (!trimmed || trimmed.includes('placeholder') || trimmed.includes('your_supabase_url')) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

let supabase = null;

if (!isValidHttpUrl(supabaseUrl) || !supabaseKey || supabaseKey.includes('placeholder')) {
  console.info('[PrepMind] Supabase credentials not provided or placeholder; running in offline/local storage mode.');
} else {
  try {
    supabase = createClient(supabaseUrl.trim(), supabaseKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    // Safeguard: Ensure unreachable Supabase instances don't deadlock the browser
    if (typeof window !== 'undefined' && supabase?.auth?.getSession) {
      supabase.auth.getSession().catch((err) => {
        console.warn('[PrepMind] Supabase initial session check failed (continuing in offline/guest mode):', err?.message || err);
      });
    }
  } catch (err) {
    console.warn('[PrepMind] Supabase client initialization failed:', err);
    supabase = null;
  }
}

export { supabase };
