import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_KEY;

function isValidHttpUrl(stringUrl) {
  if (!stringUrl || typeof stringUrl !== 'string') return false;
  const trimmed = stringUrl.trim();
  if (
    !trimmed ||
    trimmed.includes('placeholder') ||
    trimmed.includes('your_supabase_url') ||
    trimmed.includes('your-project')
  ) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return Boolean(
    trimmed &&
    !trimmed.includes('placeholder') &&
    !trimmed.includes('your_anon_key') &&
    !trimmed.includes('your_supabase_anon_key')
  );
}

let supabase = null;
const isConfigured = isValidHttpUrl(supabaseUrl) && isValidKey(supabaseKey);

if (!isConfigured) {
  console.info('[PrepMind] Supabase credentials not provided or placeholder; running in resilient local storage / database mode.');
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

export function isSupabaseConfigured() {
  return Boolean(supabase && isConfigured);
}

export function getDatabaseMode() {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

export { supabase };
