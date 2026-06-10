-- Migration: create profiles table
-- Stores the owner profile, keyed 1:1 to the auth user. Owner-scoped RLS.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text check (bio is null or char_length(bio) <= 300),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read only their own profile row.
create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

-- A user can insert only their own profile row.
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = auth.uid());

-- A user can update only their own profile row (required for upsert-on-retry).
create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());
