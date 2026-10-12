-- ============================================================================
-- PrepMind AI — Production RAG, Storage & Vector Search Schema Migration
-- Migration: 20261012000000_rag_storage_schema.sql
-- Enables: pgvector, documents metadata, vector chunks, match_document_chunks RPC,
--          and private Supabase Storage bucket with strict user-isolated RLS.
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 2. DOCUMENTS METADATA TABLE
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  storage_path text,
  mime_type text,
  file_size bigint default 0,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  error_message text,
  page_count integer default 0,
  character_count integer default 0,
  content_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure all columns exist idempotently on existing tables
alter table public.documents add column if not exists user_id uuid;
alter table public.documents add column if not exists name text;
alter table public.documents add column if not exists storage_path text;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists file_size bigint default 0;
alter table public.documents add column if not exists status text default 'uploaded';
alter table public.documents add column if not exists error_message text;
alter table public.documents add column if not exists page_count integer default 0;
alter table public.documents add column if not exists character_count integer default 0;
alter table public.documents add column if not exists content_hash text;
alter table public.documents add column if not exists created_at timestamptz default now();
alter table public.documents add column if not exists updated_at timestamptz default now();

-- 3. DOCUMENT CHUNKS TABLE WITH 768-DIMENSION EMBEDDING VECTOR (Gemini text-embedding-004)
create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null,
  chunk_index integer not null default 0,
  page_number integer default 1,
  chunk_text text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

alter table public.chunks add column if not exists document_id uuid;
alter table public.chunks add column if not exists user_id uuid;
alter table public.chunks add column if not exists chunk_index integer default 0;
alter table public.chunks add column if not exists page_number integer default 1;
alter table public.chunks add column if not exists chunk_text text;
alter table public.chunks add column if not exists embedding vector(768);
alter table public.chunks add column if not exists created_at timestamptz default now();

-- 4. PERFORMANCE INDEXES
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_created_at on public.documents(created_at desc);

create index if not exists idx_chunks_document_id on public.chunks(document_id);
create index if not exists idx_chunks_user_id on public.chunks(user_id);

-- Cosine distance vector index (HNSW for low-latency similarity queries)
do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'idx_chunks_embedding_hnsw'
  ) then
    execute 'create index idx_chunks_embedding_hnsw on public.chunks using hnsw (embedding vector_cosine_ops)';
  end if;
exception
  when others then
    -- Fall back to ivfflat if HNSW is not available on older postgres versions
    if not exists (select 1 from pg_indexes where indexname = 'idx_chunks_embedding_ivfflat') then
      execute 'create index idx_chunks_embedding_ivfflat on public.chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
    end if;
end $$;

-- 5. SECURE VECTOR SEARCH RPC FUNCTION
-- Performs owner-isolated cosine similarity retrieval.
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_threshold float default 0.25,
  match_count int default 5,
  filter_doc_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  chunk_text text,
  page_number int,
  similarity float
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    d.name as document_name,
    c.chunk_text,
    c.page_number,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where (c.user_id = auth.uid() or auth.role() = 'service_role')
    and (filter_doc_ids is null or c.document_id = any(filter_doc_ids))
    and (c.embedding is not null)
    and (1 - (c.embedding <=> query_embedding)) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

revoke execute on function public.match_document_chunks(vector(768), float, int, uuid[]) from public, anon;
grant execute on function public.match_document_chunks(vector(768), float, int, uuid[]) to authenticated, service_role;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES FOR DOCUMENTS & CHUNKS
alter table public.documents enable row level security;
alter table public.chunks enable row level security;

-- Documents RLS: Strict user isolation
drop policy if exists "Users can read own documents" on public.documents;
create policy "Users can read own documents"
  on public.documents for select
  using (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id or auth.role() = 'service_role');

-- Chunks RLS: Strict user isolation
drop policy if exists "Users can read own chunks" on public.chunks;
create policy "Users can read own chunks"
  on public.chunks for select
  using (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can insert own chunks" on public.chunks;
create policy "Users can insert own chunks"
  on public.chunks for insert
  with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can delete own chunks" on public.chunks;
create policy "Users can delete own chunks"
  on public.chunks for delete
  using (auth.uid() = user_id or auth.role() = 'service_role');

-- 7. STORAGE BUCKET & STORAGE RLS POLICIES
-- Setup private 'study_materials' bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study_materials',
  'study_materials',
  false,
  10485760, -- 10MB limit
  array['application/pdf', 'text/plain', 'text/markdown', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'text/plain', 'text/markdown', 'application/octet-stream'];

-- Storage object policies (Users are scoped to their own top-level folder: {user_id}/{filename})
drop policy if exists "Authenticated users can upload own study materials" on storage.objects;
create policy "Authenticated users can upload own study materials"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study_materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users can read own study materials" on storage.objects;
create policy "Authenticated users can read own study materials"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'study_materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users can delete own study materials" on storage.objects;
create policy "Authenticated users can delete own study materials"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study_materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
