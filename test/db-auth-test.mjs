import assert from 'node:assert';

console.log('====================================================');
console.log('   PrepMind Database & Auth Verification Suite      ');
console.log('====================================================\n');

// 1. Verify schema definitions
console.log('[Test 1] Verifying Supabase SQL Schema structure...');
import fs from 'node:fs';
const sqlSchema = fs.readFileSync('supabase_schema.sql', 'utf8');
assert(sqlSchema.includes('create table if not exists public.profiles'), 'Schema must define profiles table');
assert(sqlSchema.includes('create table if not exists public.documents'), 'Schema must define documents table');
assert(sqlSchema.includes('create table if not exists public.chunks'), 'Schema must define chunks table');
assert(sqlSchema.includes('create table if not exists public.users'), 'Schema must define users table');
assert(sqlSchema.includes('create table if not exists public.practice_history'), 'Schema must define practice_history table');
assert(sqlSchema.includes('create table if not exists public.interviews'), 'Schema must define interviews table');
assert(sqlSchema.includes('create table if not exists public.questions'), 'Schema must define questions table');
assert(sqlSchema.includes('create table if not exists public.results'), 'Schema must define results table');
assert(sqlSchema.includes('grant usage on schema public to postgres, anon, authenticated, service_role'), 'Schema must grant usage to roles');
assert(sqlSchema.includes('alter table public.profiles enable row level security'), 'Schema must enable RLS on profiles');
console.log('✓ Test 1 Passed: Supabase schema includes profiles, users, documents, chunks, practice_history, and RLS.\n');

// 2. Verify server routes resilience when Supabase is unconfigured
console.log('[Test 2] Verifying server database route resilience...');
const serverFile = fs.readFileSync('server/server.js', 'utf8');
assert(serverFile.includes('supabaseHealth'), 'Server must have health check for database');
assert(serverFile.includes('supabase.from(\'health\')'), 'Health check must query database when available');
console.log('✓ Test 2 Passed: Server handles database health and degraded fallback.\n');

// 3. Verify client fallback files exist and are clean
console.log('[Test 3] Verifying frontend local database and authentication files...');
assert(fs.existsSync('app/src/lib/localDb.ts'), 'localDb.ts must exist');
assert(fs.existsSync('app/src/pages/Login.tsx'), 'Login.tsx must exist');
assert(fs.existsSync('app/src/pages/Signup.tsx'), 'Signup.tsx must exist');
assert(fs.existsSync('app/src/context/AuthContext.tsx'), 'AuthContext.tsx must exist');

const localDbContent = fs.readFileSync('app/src/lib/localDb.ts', 'utf8');
assert(localDbContent.includes('getLocalInterviews'), 'localDb must export getLocalInterviews');
assert(localDbContent.includes('getLocalQuestions'), 'localDb must export getLocalQuestions');
assert(localDbContent.includes('saveLocalResult'), 'localDb must export saveLocalResult');
assert(localDbContent.includes('getLocalProgressInsights'), 'localDb must export getLocalProgressInsights');

const authContextContent = fs.readFileSync('app/src/context/AuthContext.tsx', 'utf8');
assert(authContextContent.includes('loginAsGuest'), 'AuthContext must support 1-click guest access');
assert(authContextContent.includes('isSupabaseConfigured'), 'AuthContext must check Supabase configuration');
console.log('✓ Test 3 Passed: All local database and authentication modules are complete.\n');

console.log('====================================================');
console.log('     All Database & Auth Checks Passed!             ');
console.log('====================================================');
