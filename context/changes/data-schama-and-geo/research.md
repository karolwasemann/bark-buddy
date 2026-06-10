---
date: 2026-06-10T15:18:00+02:00
researcher: kiro
git_commit: 8ef732fac7c1ca72c8961790965d6bdbdcb15926
branch: main
repository: 10xdevs
topic: "F-02: Data schema and geo-overlap matching function"
tags: [research, codebase, supabase, postgis, geo-matching, rls, schema]
status: complete
last_updated: 2026-06-10
last_updated_by: kiro
---

# Research: F-02 Data Schema and Geo-Overlap Matching Function

**Date**: 2026-06-10T15:18:00+02:00
**Researcher**: kiro
**Git Commit**: 8ef732fac7c1ca72c8961790965d6bdbdcb15926
**Branch**: main
**Repository**: 10xdevs

## Research Question

What schema, geo-matching approach, and RLS policies does F-02 need — given the existing tables, S-02's explicit deferral of PostGIS, and the PRD requirement for ≥10% circle-overlap matching with location privacy?

## Summary

- **4 migrations already exist** — `profiles`, `dogs`, `dog-photos` bucket, `walking_pins`. All use owner-only RLS. No cross-user reads.
- **`walking_pins`** stores `lat float8`, `lng float8`, `radius_m integer`. S-02 explicitly deferred PostGIS geography to F-02.
- **F-02 must**: enable PostGIS extension, add a `geography(Point)` column (or computed from lat/lng), create a geo-overlap matching function (≥10% of smaller circle), and introduce cross-user RLS for match visibility while keeping pin/radius/overlap invisible.
- **No service-role key** — all access via RLS (established in F-01).
- **UI contract unchanged** — components deal in `{lat, lng, radius_m}` numbers only.

## Detailed Findings

### Existing Schema (4 migrations)

| Table | Key Columns | Ownership Model |
|-------|-------------|-----------------|
| `profiles` | `id uuid PK → auth.users`, display_name, bio, created_at | 1:1 with auth user |
| `dogs` | `id uuid PK`, `owner_id uuid unique FK → profiles`, name, breed, photo_path | 1 dog per user (MVP) |
| `walking_pins` | `id uuid PK`, `dog_id uuid unique FK → dogs`, lat, lng, radius_m (200–5000), created_at, updated_at | 1 pin per dog |
| `dog-photos` (storage) | private bucket, RLS per folder = auth.uid() | owner CRUD only |

- `supabase/migrations/20260610092301_create_profiles.sql`
- `supabase/migrations/20260610092302_create_dogs.sql`
- `supabase/migrations/20260610092303_create_dog_photos_bucket.sql`
- `supabase/migrations/20260610092304_create_walking_pins.sql`

### Current RLS Pattern

All tables: **owner-only** (select/insert/update). No DELETE on tables. No cross-user reads.

```sql
-- Example: walking_pins select
CREATE POLICY select_own ON public.walking_pins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.dogs WHERE dogs.id = walking_pins.dog_id AND dogs.owner_id = auth.uid())
  );
```

### Geo Data — Current State

- `walking_pins.lat` / `walking_pins.lng` = `float8` (plain numbers)
- `walking_pins.radius_m` = `integer` (200–5000, default 1000)
- **No PostGIS** extension enabled
- **No spatial index**
- **Leaflet** on frontend (vanilla, not react-leaflet) — only sends/receives `{lat, lng}`

### What S-02 Explicitly Deferred to F-02

From S-02 plan and research:
> "walking_pins uses simple float8 columns for lat/lng. F-02 will later add a PostGIS geography(Point) column for geo-queries — the UI layer won't change since it only deals in {lat, lng} numbers."

> "If F-02 runs before S-02, adjust migration to add radius_m column to whatever table F-02 creates. Current plan assumes F-02 has not run yet."

Since S-02 is done, `walking_pins` already exists with lat/lng/radius_m. F-02 adds PostGIS on top.

### Dependencies

From `package.json`:
- `@supabase/supabase-js`: ^2.106.2
- `@supabase/ssr`: ^0.10.3
- `leaflet`: ^1.9.4
- `supabase` CLI (devDep): 2.105.0

**Not present**: PostGIS client libs, turf.js, Mapbox — no npm geo-math libraries.

### Supabase Config

- `supabase/config.toml`: Postgres 17, port 54322, studio 54323
- No PostGIS extension listed in config (needs `[db.extensions]` or SQL `CREATE EXTENSION`)
- Seed file referenced but doesn't exist

## Architecture Insights

### F-02 Schema Design Decisions

1. **PostGIS vs pure math**
   - PostGIS is available on all Supabase plans (Postgres 17 includes it)
   - Circle-overlap with pure PL/pgSQL requires manual great-circle math — fragile and slow at scale
   - PostGIS `ST_Buffer` + `ST_Intersection` + `ST_Area` handles the ≥10% overlap check natively
   - **Recommendation**: Enable PostGIS, add `geography(Point)` generated column from existing lat/lng

2. **Geography column approach**
   - Add a generated column: `location geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED`
   - This preserves backward-compatibility — existing lat/lng inserts/updates automatically populate the geography column
   - UI contract stays: components send `{lat, lng, radius_m}`, no change needed

3. **Matching function**
   - PRD: overlap ≥10% of smaller circle, sorted by pin-to-pin distance
   - Approach: `ST_Area(ST_Intersection(buffer_a, buffer_b)) / ST_Area(smaller_buffer) >= 0.10`
   - Return: matched profile/dog data sorted by `ST_Distance(a.location, b.location)`
   - Must NOT return pin coordinates, radius, or overlap percentage to the client (privacy NFR)

4. **RLS for match visibility**
   - Current: owner-only reads everywhere
   - Needed: users who **match** can see each other's profile + dog (name, breed, photo) but NOT pin/radius
   - Options:
     - A) Materialized `matches` table updated by trigger/cron
     - B) RLS policy with inline subquery checking overlap
     - C) Security-definer function that returns only safe columns
   - **Recommendation**: Security-definer function (C) — simplest, no materialization overhead at MVP scale, enforces column-level privacy by selecting only safe fields

5. **Spatial index**
   - `CREATE INDEX idx_walking_pins_location ON walking_pins USING GIST (location);`
   - Essential for `ST_DWithin` pre-filter before computing expensive intersection areas

### Migration Plan (proposed order)

1. Enable PostGIS extension
2. Add `location` generated column + GIST index to `walking_pins`
3. Create `find_matches(user_uuid)` function (security definer, returns safe columns only)
4. Add cross-user RLS policy for profiles/dogs visible to matches (or keep function-only access)

### RLS Strategy for Privacy

The PRD NFR "privacy lokalizacji" requires:
- **Never expose** pin coordinates, radius, or overlap area to other users
- **Only expose**: that a match exists, profile info (display_name, bio), dog info (name, breed, photo)

Strategy:
- Keep `walking_pins` RLS as owner-only (no changes)
- The matching function is `SECURITY DEFINER` — runs as function owner (bypasses caller's RLS), returns only safe columns
- Caller (anon-key user) can call the function but can't query walking_pins directly
- Profiles/dogs get a new `select_for_matches` policy or are accessed only through the function

## Historical Context (from prior changes)

- `context/archive/2026-05-27-supabase-auth-scaffold/` — Established: no service-role key, RLS-only access, `getUser()` pattern
- `context/archive/2026-06-10-user-and-dog-profile/` — Created profiles + dogs tables, established migration naming, upsert with `onConflict` pattern
- `context/archive/2026-06-10-walking-area-pin/` — Created walking_pins with float8 lat/lng, explicitly deferred PostGIS to F-02, chose Leaflet for maps

## Code References

- `supabase/migrations/20260610092304_create_walking_pins.sql` — current pin schema
- `supabase/migrations/20260610092301_create_profiles.sql` — profiles table + RLS
- `supabase/migrations/20260610092302_create_dogs.sql` — dogs table + RLS
- `supabase/config.toml` — Postgres 17, no PostGIS config yet
- `src/lib/supabase/server.ts` — server-side Supabase client (anon key only)
- `src/components/MapView.tsx` — Leaflet map component

## Open Questions

1. **Materialization vs real-time**: Should matches be computed on-demand (function call) or materialized (trigger/cron)? At MVP scale (<1000 users), on-demand is fine. Document the threshold for switching.
2. **Match symmetry**: If A matches B, does B automatically match A? (Circle overlap is symmetric, so yes — but confirm with PRD.)
3. **Stale pins**: Should there be an `expires_at` or `active` flag? PRD doesn't mention it but real users might abandon pins.
4. **Dog photo visibility in match list**: PRD says dog photo visible only to matches (NFR privacy zdjęć psa). The function must include photo_path only for matched users.
