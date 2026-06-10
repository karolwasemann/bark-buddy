# PostGIS & Geo-Overlap Matching Function — Implementation Plan

## Overview

Enable PostGIS on the Supabase Postgres instance, add a generated geography column to `walking_pins`, and create a security-definer function `find_matches()` that returns matched users whose walking circles overlap by ≥10% of the smaller circle — without leaking any location data.

## Current State Analysis

- **4 migrations exist**: `profiles`, `dogs`, `dog-photos` bucket, `walking_pins`
- **`walking_pins`** stores `lat float8`, `lng float8`, `radius_m integer` (200–5000) with owner-only RLS
- **No PostGIS** extension enabled, no spatial index, no geography column
- **No `.rpc()` calls** exist in the codebase — this is the first Supabase function call
- **Leaflet** on frontend sends/receives `{lat, lng}` plain numbers — no change needed
- **RLS pattern**: owner-only everywhere, no cross-user reads

### Key Discoveries:

- `supabase/migrations/20260610092304_create_walking_pins.sql` — current schema with float8 lat/lng
- `src/lib/supabase/server.ts` — uses anon key only via `createServerClient`
- S-02 explicitly deferred PostGIS to this feature (F-02)
- PRD confirms: overlap is symmetric, pin/radius/overlap% NEVER exposed to other users
- PRD confirms: dog photo visible only to matched users

## Desired End State

After this plan is complete:
1. PostGIS extension is enabled in the local Supabase instance
2. `walking_pins` has a generated `location geography(Point, 4326)` column with a GIST spatial index
3. A `find_matches(requesting_user_uuid)` function exists that:
   - Finds all other users whose circles overlap ≥10% of the smaller circle
   - Returns profile + dog info + photo path + coarse distance bucket
   - Sorts by pin-to-pin distance (ascending)
   - Never exposes coordinates, radius, or overlap percentage
4. The function is callable via `supabase.rpc('find_matches')` from the app

**Verification**: Call the function from `psql` with test data and confirm correct matches are returned with no location leakage.

## What We're NOT Doing

- No materialized matches table (on-demand is fine at MVP scale)
- No changes to frontend/UI (that's a separate feature)
- No changes to existing RLS policies on `walking_pins` (stays owner-only)
- No cross-user SELECT policies on profiles/dogs tables (function handles access)
- No automated test framework (manual verification per project state)
- No time-window matching or expiry logic
- No filter/sort by dog size (nice-to-have, deferred)

## Implementation Approach

1. Enable PostGIS via migration
2. Add generated geography column + GIST index to `walking_pins`
3. Create `find_matches()` as a `SECURITY DEFINER` function that:
   - Uses `ST_Buffer` to create circles from each pin's location + radius
   - Uses `ST_Intersection` + `ST_Area` to compute overlap
   - Compares overlap area to `ST_Area` of the smaller buffer (≥10% threshold)
   - Pre-filters with `ST_DWithin` for performance (max possible match distance = sum of both radii)
   - Returns only safe columns + a distance bucket label
   - Runs as function owner (bypasses RLS), so `walking_pins` stays locked down

---

## Phase 1: PostGIS Extension + Schema Changes

### Overview

Enable PostGIS and add the geography infrastructure to `walking_pins`.

### Changes Required:

#### 1. New migration: enable PostGIS

**File**: `supabase/migrations/20260610092305_enable_postgis.sql`

**Intent**: Enable the PostGIS extension so geography types and spatial functions become available.

**Contract**: `CREATE EXTENSION IF NOT EXISTS postgis;` — must run before any migration that uses geography types.

#### 2. New migration: add geography column + index

**File**: `supabase/migrations/20260610092306_add_walking_pins_geography.sql`

**Intent**: Add a generated `location` column that auto-computes a geography point from existing `lat`/`lng`, and a GIST spatial index for fast proximity queries.

**Contract**:
- Column: `location geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED`
- Index: `CREATE INDEX idx_walking_pins_location ON walking_pins USING GIST (location);`
- No changes to existing columns or RLS policies

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly: `supabase db reset`
- Column exists: `SELECT location FROM walking_pins;` returns geography values (not errors)
- Index exists: `SELECT indexname FROM pg_indexes WHERE tablename = 'walking_pins' AND indexname = 'idx_walking_pins_location';`

#### Manual Verification:

- Insert a pin via the app UI, then check in Supabase Studio that `location` column is populated automatically

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Geo-Overlap Matching Function

### Overview

Create the `find_matches()` security-definer function that computes matches and returns safe data with distance buckets.

### Changes Required:

#### 1. New migration: create find_matches function

**File**: `supabase/migrations/20260610092307_create_find_matches_function.sql`

**Intent**: Create a Postgres function that finds all matching users for a given user based on ≥10% circle overlap, returns profile + dog info with a coarse distance bucket, sorted by proximity. Runs as SECURITY DEFINER to access `walking_pins` without granting cross-user read.

**Contract**:

Function signature:
```sql
find_matches(requesting_user_id uuid)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  bio text,
  dog_name text,
  dog_breed text,
  dog_photo_path text,
  distance_bucket text  -- 'nearby' | 'moderate' | 'far'
)
SECURITY DEFINER
```

Core logic:
- Join `walking_pins` → `dogs` → `profiles` to get the requesting user's pin
- Pre-filter candidates with `ST_DWithin(a.location, b.location, a.radius_m + b.radius_m)` (no match possible beyond sum of radii)
- Compute overlap: `ST_Area(ST_Intersection(ST_Buffer(a.location, a.radius_m), ST_Buffer(b.location, b.radius_m)))` 
- Compare to smaller circle: `overlap_area / LEAST(ST_Area(ST_Buffer(a.location, a.radius_m)), ST_Area(ST_Buffer(b.location, b.radius_m))) >= 0.10`
- Distance buckets: `ST_Distance(a.location, b.location)` → <1000m = 'nearby', 1000-3000m = 'moderate', >3000m = 'far'
- Sort by `ST_Distance` ascending
- Exclude the requesting user themselves
- Set `SECURITY DEFINER` + `SET search_path = public` for safety

#### 2. Grant execute permission

**Intent**: Allow authenticated users to call the function via RPC.

**Contract**: `GRANT EXECUTE ON FUNCTION find_matches(uuid) TO authenticated;` — included in the same migration file.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly: `supabase db reset`
- Function exists: `SELECT proname FROM pg_proc WHERE proname = 'find_matches';`
- Function is security definer: `SELECT prosecdef FROM pg_proc WHERE proname = 'find_matches';` returns `true`

#### Manual Verification:

- Insert 3-4 test pins via the app with known overlapping/non-overlapping positions
- Call `SELECT * FROM find_matches('<test-user-uuid>');` in Supabase SQL editor
- Verify: overlapping pins appear as matches, non-overlapping don't
- Verify: no lat/lng/radius values in the result
- Verify: distance_bucket values are correct ('nearby', 'moderate', 'far')
- Verify: requesting user is excluded from their own results

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Integration Verification

### Overview

End-to-end verification that the function works correctly from the app's Supabase client.

### Changes Required:

#### 1. Verify RPC call works from app context

**File**: No file changes — this is a verification-only phase.

**Intent**: Confirm that `supabase.rpc('find_matches', { requesting_user_id: userId })` works from the server-side Supabase client with anon key + user JWT.

**Contract**: The authenticated user's JWT is passed via the Supabase client. The function receives the user ID parameter. RLS on `walking_pins` doesn't block the function because it's SECURITY DEFINER.

### Success Criteria:

#### Automated Verification:

- `supabase db reset` completes without errors (all 3 new migrations apply)
- TypeScript types generate without errors (if using `supabase gen types`)

#### Manual Verification:

- Log in as User A in the app, place a pin
- Log in as User B in a different browser, place an overlapping pin
- Run `supabase.rpc('find_matches', { requesting_user_id: '<user-a-id>' })` from the Supabase SQL editor or a quick test script
- Confirm User B appears in the results with correct profile/dog data and distance bucket
- Confirm no coordinates or radius values leak in the response

**Implementation Note**: After completing this phase and all verification passes, the geo-matching backend is ready for frontend integration (separate change).

---

## Testing Strategy

### Manual Testing Steps:

1. Reset local Supabase: `supabase db reset`
2. Create 2 users via the app (register + login)
3. Each user: create profile, add dog, place walking pin
4. Place pins so circles overlap (e.g., same lat/lng, radius 1000m each → 100% overlap)
5. Query: `SELECT * FROM find_matches('<user-a-uuid>');`
6. Expect: User B in results with profile + dog info + 'nearby' bucket
7. Move User B's pin far away (no overlap) and update
8. Re-query: expect empty results
9. Edge case: User with pin but no dog → should not appear (JOIN requires dog)

### Edge Cases to Verify:

- Exact same location → should match (100% overlap, 'nearby')
- Barely overlapping (just above 10%) → should match
- Barely not overlapping (just below 10%) → should NOT match
- User with no pin → should not cause errors (function returns empty)
- Single user in database → empty result (no one to match with)

## Performance Considerations

- `ST_DWithin` pre-filter uses the GIST index → eliminates distant pins before expensive area calculations
- At MVP scale (<1000 pins), even without the index, performance would be acceptable (~10-50ms)
- The GIST index future-proofs for growth — no schema changes needed later
- `ST_Buffer` with `geography` type uses meters directly (no projection math needed)

## Migration Notes

- All 3 migrations are additive (no destructive changes)
- Rollback: drop function, drop index, drop column, drop extension (in reverse order)
- Existing data: generated column auto-populates for any existing `walking_pins` rows
- No app code changes required in this plan — frontend integration is a separate change

## References

- Related research: `context/changes/data-schama-and-geo/research.md`
- PRD business logic: `context/foundation/prd.md` — "Business Logic (10% overlap rule)" section
- Existing migration: `supabase/migrations/20260610092304_create_walking_pins.sql`
- Supabase client: `src/lib/supabase/server.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: PostGIS Extension + Schema Changes

#### Automated

- [x] 1.1 Migration applies cleanly: `supabase db reset`
- [x] 1.2 Column exists: `SELECT location FROM walking_pins;` returns geography values
- [x] 1.3 Index exists in pg_indexes

#### Manual

- [x] 1.4 Insert a pin via app UI, confirm location column populated in Studio

### Phase 2: Geo-Overlap Matching Function

#### Automated

- [ ] 2.1 Migration applies cleanly: `supabase db reset`
- [ ] 2.2 Function exists in pg_proc
- [ ] 2.3 Function is security definer

#### Manual

- [ ] 2.4 Overlapping pins appear as matches
- [ ] 2.5 Non-overlapping pins do not appear
- [ ] 2.6 No lat/lng/radius in results
- [ ] 2.7 Distance buckets correct
- [ ] 2.8 Requesting user excluded from own results

### Phase 3: Integration Verification

#### Automated

- [ ] 3.1 All migrations apply cleanly on fresh reset
- [ ] 3.2 TypeScript types generate without errors

#### Manual

- [ ] 3.3 RPC call works with authenticated user JWT
- [ ] 3.4 Correct match data returned end-to-end
- [ ] 3.5 No location data leaks in response
