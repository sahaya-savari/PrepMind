import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env missing:', { urlPresent: Boolean(supabaseUrl), keyPresent: Boolean(supabaseKey) })
  throw new Error('Missing Supabase env vars')
}

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase KEY:', supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey)
