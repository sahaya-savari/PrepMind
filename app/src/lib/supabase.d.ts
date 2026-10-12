import type { SupabaseClient } from '@supabase/supabase-js';

export const supabase: SupabaseClient | any;
export function isSupabaseConfigured(): boolean;
export function getDatabaseMode(): 'supabase' | 'local';
