import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_KEY } = process.env;
const serviceKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;

if (!SUPABASE_URL || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

export const supabase = createClient(SUPABASE_URL, serviceKey);
