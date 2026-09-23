-- MedDroid — shared cloud sync for the newer agentic workflows
-- (child immunization, pregnancy, recovery, medicines, caregiver profiles…).
-- Run ONCE in the Supabase SQL editor. One flexible per-user table (jsonb data),
-- RLS-scoped so each signed-in user reads/writes only their own records.

create table if not exists public.health_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   text not null,          -- the record's local id (for sync/dedupe)
  kind        text not null,          -- child | pregnancy | recovery | medicine | profile | …
  data        jsonb not null,         -- the record payload
  ts          timestamptz not null,   -- created
  updated     timestamptz not null,   -- last modified (last-write-wins)
  created_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

alter table public.health_records enable row level security;

drop policy if exists "records own select" on public.health_records;
create policy "records own select" on public.health_records
  for select using (auth.uid() = user_id);

drop policy if exists "records own insert" on public.health_records;
create policy "records own insert" on public.health_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "records own update" on public.health_records;
create policy "records own update" on public.health_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "records own delete" on public.health_records;
create policy "records own delete" on public.health_records
  for delete using (auth.uid() = user_id);

create index if not exists health_records_user_kind on public.health_records (user_id, kind);
