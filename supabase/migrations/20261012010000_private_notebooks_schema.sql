-- ============================================================================
-- PrepMind AI — Private AI Notebooks & Document Grounding Migration
-- Migration: 20261012010000_private_notebooks_schema.sql
-- Enables: Notebooks, Notebook-scoped documents, Notebook messages,
--          Notebook learning artifacts, and notebook-filtered vector search.
-- ============================================================================

-- 1. NOTEBOOKS TABLE
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notebooks add column if not exists user_id uuid;
alter table public.notebooks add column if not exists title text;
alter table public.notebooks add column if not exists description text;
alter table public.notebooks add column if not exists created_at timestamptz default now();
alter table public.notebooks add column if not exists updated_at timestamptz default now();

-- Link documents to notebooks (optional foreign key for notebook scoping)
alter table public.documents add column if not exists notebook_id uuid references public.notebooks(id) on delete cascade;

-- 2. NOTEBOOK MESSAGES (Scoped conversations with cited evidence)
create table if not exists public.notebook_messages (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.notebook_messages add column if not exists notebook_id uuid;
alter table public.notebook_messages add column if not exists user_id uuid;
alter table public.notebook_messages add column if not exists role text;
alter table public.notebook_messages add column if not exists content text;
alter table public.notebook_messages add column if not exists citations jsonb default '[]'::jsonb;
alter table public.notebook_messages add column if not exists created_at timestamptz default now();

-- 3. NOTEBOOK ARTIFACTS (Summaries, Study Guides, Flashcards, Practice Drills)
create table if not exists public.notebook_artifacts (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  user_id uuid not null,
  type text not null check (type in ('summary', 'notes', 'flashcards', 'quiz', 'guide')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.notebook_artifacts add column if not exists notebook_id uuid;
alter table public.notebook_artifacts add column if not exists user_id uuid;
alter table public.notebook_artifacts add column if not exists type text;
alter table public.notebook_artifacts add column if not exists title text;
alter table public.notebook_artifacts add column if not exists content jsonb default '{}'::jsonb;
alter table public.notebook_artifacts add column if not exists created_at timestamptz default now();

-- 4. PERFORMANCE INDEXES
create index if not exists idx_notebooks_user on public.notebooks(user_id);
create index if not exists idx_notebooks_created on public.notebooks(created_at desc);
create index if not exists idx_documents_notebook on public.documents(notebook_id);
create index if not exists idx_notebook_messages_notebook on public.notebook_messages(notebook_id);
create index if not exists idx_notebook_messages_created on public.notebook_messages(created_at asc);
create index if not exists idx_notebook_artifacts_notebook on public.notebook_artifacts(notebook_id);

-- 5. ROW LEVEL SECURITY (RLS)
alter table public.notebooks enable row level security;
alter table public.notebook_messages enable row level security;
alter table public.notebook_artifacts enable row level security;

-- Notebooks RLS: Strict user isolation
drop policy if exists "Users can read own notebooks" on public.notebooks;
create policy "Users can read own notebooks"
  on public.notebooks for select
  using (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can insert own notebooks" on public.notebooks;
create policy "Users can insert own notebooks"
  on public.notebooks for insert
  with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can update own notebooks" on public.notebooks;
create policy "Users can update own notebooks"
  on public.notebooks for update
  using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "Users can delete own notebooks" on public.notebooks;
create policy "Users can delete own notebooks"
  on public.notebooks for delete
  using (auth.uid() = user_id or auth.role() = 'service_role');

-- Notebook Messages RLS: Strict user and notebook ownership isolation
drop policy if exists "Users can read own notebook messages" on public.notebook_messages;
create policy "Users can read own notebook messages"
  on public.notebook_messages for select
  using (
    (auth.uid() = user_id and exists (
      select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
    )) or auth.role() = 'service_role'
  );

drop policy if exists "Users can insert own notebook messages" on public.notebook_messages;
create policy "Users can insert own notebook messages"
  on public.notebook_messages for insert
  with check (
    (auth.uid() = user_id and exists (
      select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
    )) or auth.role() = 'service_role'
  );

drop policy if exists "Users can delete own notebook messages" on public.notebook_messages;
create policy "Users can delete own notebook messages"
  on public.notebook_messages for delete
  using (
    (auth.uid() = user_id and exists (
      select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
    )) or auth.role() = 'service_role'
  );

-- Notebook Artifacts RLS: Strict user and notebook ownership isolation
drop policy if exists "Users can read own notebook artifacts" on public.notebook_artifacts;
create policy "Users can read own notebook artifacts"
  on public.notebook_artifacts for select
  using (
    (auth.uid() = user_id and exists (
      select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
    )) or auth.role() = 'service_role'
  );

drop policy if exists "Users can insert own notebook artifacts" on public.notebook_artifacts;
create policy "Users can insert own notebook artifacts"
  on public.notebook_artifacts for insert
  with check (
    (auth.uid() = user_id and exists (
      select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
    )) or auth.role() = 'service_role'
  );

drop policy if exists "Users can delete own notebook artifacts" on public.notebook_artifacts;
create policy "Users can delete own notebook artifacts"
  on public.notebook_artifacts for delete
  using (
    (auth.uid() = user_id and exists (
      select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
    )) or auth.role() = 'service_role'
  );

-- Documents RLS update: Ensure attached notebook_id belongs to the caller
drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (
    (auth.uid() = user_id and (
      notebook_id is null or exists (
        select 1 from public.notebooks n where n.id = notebook_id and (n.user_id = auth.uid() or auth.role() = 'service_role')
      )
    )) or auth.role() = 'service_role'
  );

-- 6. EXTENDED VECTOR SEARCH RPC WITH NOTEBOOK FILTERING & OWNERSHIP VERIFICATION
-- Drop prior 4-argument and 5-argument signatures to avoid overload conflicts in PostgreSQL
drop function if exists public.match_document_chunks(vector(768), float, int, uuid[]);
drop function if exists public.match_document_chunks(vector(768), float, int, uuid[], uuid);

create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_threshold float default 0.25,
  match_count int default 5,
  filter_doc_ids uuid[] default null,
  filter_notebook_id uuid default null
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
  where (
    -- 1. Chunk and document must BOTH belong to the caller (or service role)
    ((c.user_id = auth.uid() and d.user_id = auth.uid()) or auth.role() = 'service_role')
    -- 2. Optional document ID list filter
    and (filter_doc_ids is null or c.document_id = any(filter_doc_ids))
    -- 3. Strict notebook ownership: document is in notebook AND caller owns the notebook
    and (
      filter_notebook_id is null or (
        d.notebook_id = filter_notebook_id
        and exists (
          select 1 from public.notebooks n
          where n.id = filter_notebook_id
            and (n.user_id = auth.uid() or auth.role() = 'service_role')
        )
      )
    )
    and (c.embedding is not null)
    and (1 - (c.embedding <=> query_embedding)) > match_threshold
  )
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

revoke execute on function public.match_document_chunks(vector(768), float, int, uuid[], uuid) from public, anon;
grant execute on function public.match_document_chunks(vector(768), float, int, uuid[], uuid) to authenticated, service_role;
