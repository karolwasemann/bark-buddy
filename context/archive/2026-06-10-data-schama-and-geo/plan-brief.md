# PostGIS & Geo-Overlap Matching Function — Plan Brief

> Full plan: `context/changes/data-schama-and-geo/plan.md`
> Research: `context/changes/data-schama-and-geo/research.md`

## What & Why

BarkBuddy needs to match dog owners whose walking areas overlap. Users place a pin + radius on a map; the system must find other users whose circles overlap by ≥10% of the smaller circle and show their profile — without leaking any location data. This is the core matching engine (F-02) that the PRD's primary success criterion depends on.

## Starting Point

`walking_pins` table exists with `lat float8`, `lng float8`, `radius_m integer`. No PostGIS, no spatial index, no cross-user reads. All RLS is owner-only. The app sends/receives plain `{lat, lng}` numbers via Leaflet.

## Desired End State

A user opens the matches view and sees a list of other dog owners whose walking circles overlap with theirs — with profile info, dog details, photo, and a coarse distance label ("nearby" / "moderate" / "far"). No pin coordinates, radius, or overlap percentage is ever exposed. The matching logic lives entirely in a single Postgres function callable via `.rpc()`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-------------------|--------|
| PostGIS vs pure math | PostGIS extension | Native spatial functions handle circle-overlap correctly on a sphere; avoids fragile custom trig. | Research |
| Geography column approach | Generated column from lat/lng | Auto-maintains sync, enables GIST index, zero app changes. | Plan |
| Match computation | On-demand function (not materialized) | No staleness issues, simplest to build, fine at MVP scale (<1000 users). | Plan |
| Access control | SECURITY DEFINER function | Keeps walking_pins RLS owner-only; function bypasses RLS and returns only safe columns. | Research |
| Distance exposure | Coarse buckets (<1km / 1-3km / 3km+) | Useful UX context without enabling triangulation of pin position. | Plan |
| Return shape | Profile + dog + photo_path per match | One RPC call gives frontend everything for the match list. | Plan |
| Testing approach | Manual via app UI | No test framework in project yet; manual verification with known coordinates. | Plan |

## Scope

**In scope:**
- Enable PostGIS extension
- Generated geography column + GIST spatial index on `walking_pins`
- `find_matches(user_id)` function with overlap logic, privacy enforcement, distance buckets
- GRANT for authenticated users to call the function

**Out of scope:**
- Frontend match list UI (separate change)
- Materialized matches table / cron
- Time-window matching or pin expiry
- Automated tests
- Cross-user RLS policies on profiles/dogs (function handles access)

## Architecture / Approach

```
App → supabase.rpc('find_matches', {id}) → SECURITY DEFINER function
  ├── reads walking_pins (bypasses RLS)
  ├── ST_DWithin pre-filter (uses GIST index)
  ├── ST_Buffer + ST_Intersection + ST_Area for ≥10% check
  ├── JOINs profiles + dogs for safe columns
  └── returns: display_name, bio, dog_name, dog_breed, dog_photo_path, distance_bucket
```

No app code changes. No new RLS policies. One function, three migrations.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. PostGIS + Schema | Extension enabled, geography column + GIST index | None — additive migration, no breaking changes |
| 2. Matching Function | `find_matches()` with overlap logic + privacy | Overlap math correctness on sphere (PostGIS handles this, but needs manual verification) |
| 3. Integration Verification | Confirmed RPC works end-to-end with auth | First `.rpc()` call in codebase — pattern not yet established |

**Prerequisites:** Local Supabase running (`supabase start`), at least 2 test users with profiles + dogs + pins created via the app.
**Estimated effort:** ~2 sessions across 3 phases.

## Open Risks & Assumptions

- `ST_Buffer` on geography type uses a planar approximation for area calculations — acceptable for circles <5km but not geodetically exact. Fine for the 10% threshold.
- No automated tests yet — regression risk if overlap logic changes later.
- At >5000 users in a dense area, on-demand computation may need caching or materialization.

## Success Criteria (Summary)

- `find_matches()` returns correct matches for overlapping circles and empty results for non-overlapping ones
- Zero location data (lat, lng, radius, overlap%) in the function's return columns
- All migrations apply cleanly on `supabase db reset`
