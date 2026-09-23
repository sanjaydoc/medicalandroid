-- MedDroid — Chronic-Condition Coach cloud sync
-- Run ONCE in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Creates a per-user `vitals` table with Row-Level Security so each signed-in
-- user can read/write ONLY their own readings.

create table if not exists public.vitals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   text not null,                 -- the reading's local id (for sync/dedupe)
  type        text not null check (type in ('bp','glucose','weight')),
  ts          timestamptz not null,          -- when the reading was taken
  systolic    int,
  diastolic   int,
  pulse       int,
  glucose     int,
  context     text,                          -- fasting | post | random
  weight      numeric,
  created_at  timestamptz not null default now(),
  unique (user_id, client_id)                -- lets the app upsert without duplicates
);

alter table public.vitals enable row level security;

-- Each policy is scoped to the authenticated user (auth.uid()).
drop policy if exists "vitals own select" on public.vitals;
create policy "vitals own select" on public.vitals
  for select using (auth.uid() = user_id);

drop policy if exists "vitals own insert" on public.vitals;
create policy "vitals own insert" on public.vitals
  for insert with check (auth.uid() = user_id);

drop policy if exists "vitals own update" on public.vitals;
create policy "vitals own update" on public.vitals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "vitals own delete" on public.vitals;
create policy "vitals own delete" on public.vitals
  for delete using (auth.uid() = user_id);

create index if not exists vitals_user_ts on public.vitals (user_id, ts);
