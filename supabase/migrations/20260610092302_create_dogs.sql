-- Migration: create dogs table
-- Stores one dog per owner (MVP). owner_id unique enforces one-dog-per-user.
-- photo_path is an optional pointer into the private dog-photos bucket.

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  breed text not null check (char_length(breed) between 1 and 50),
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.dogs enable row level security;

-- A user can read only their own dog row.
create policy "dogs_select_own"
  on public.dogs
  for select
  using (owner_id = auth.uid());

-- A user can insert only their own dog row.
create policy "dogs_insert_own"
  on public.dogs
  for insert
  with check (owner_id = auth.uid());

-- A user can update only their own dog row.
create policy "dogs_update_own"
  on public.dogs
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
