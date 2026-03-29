import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_KEY } = process.env;



let supabase = null;
const isSupabaseMissing = !SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL === 'your_supabase_url' || SUPABASE_KEY === 'your_anon_key' || SUPABASE_URL === 'placeholder' || SUPABASE_KEY === 'placeholder';
if (!isSupabaseMissing) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (err) {
    supabase = null;
    console.warn('[PrepMind] Supabase client creation failed:', err.message);
  }
} else {
  console.warn('[PrepMind] Supabase disabled: SUPABASE_URL or SUPABASE_KEY missing or placeholder. Running in fallback mode.');
}

export { supabase };
