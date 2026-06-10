-- Migration: create walking_pins table
-- Stores one walking-area pin per dog (lat/lng + radius).

create table public.walking_pins (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null unique references public.dogs (id) on delete cascade,
  lat float8 not null,
  lng float8 not null,
  radius_m integer not null default 1000 check (radius_m between 200 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.walking_pins enable row level security;

-- Owner-scoped policies (join through dogs.owner_id).
create policy "walking_pins_select_own"
  on public.walking_pins
  for select
  using (exists (select 1 from public.dogs where dogs.id = walking_pins.dog_id and dogs.owner_id = auth.uid()));

create policy "walking_pins_insert_own"
  on public.walking_pins
  for insert
  with check (exists (select 1 from public.dogs where dogs.id = walking_pins.dog_id and dogs.owner_id = auth.uid()));

create policy "walking_pins_update_own"
  on public.walking_pins
  for update
  using (exists (select 1 from public.dogs where dogs.id = walking_pins.dog_id and dogs.owner_id = auth.uid()))
  with check (exists (select 1 from public.dogs where dogs.id = walking_pins.dog_id and dogs.owner_id = auth.uid()));
