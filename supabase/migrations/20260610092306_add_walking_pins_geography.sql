-- Migration: add geography column + spatial index to walking_pins
-- Auto-computes a geography point from existing lat/lng columns.

alter table public.walking_pins
  add column location geography(Point, 4326)
  generated always as (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored;

create index idx_walking_pins_location on public.walking_pins using gist (location);
