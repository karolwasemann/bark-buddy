---
date: 2026-06-17T10:04:53+02:00
researcher: kiro
git_commit: ab4adcc
branch: main
repository: 10xdevs
topic: "Ground risks #1, #2, #3 for Phase 1 critical-path matching tests"
tags: [research, matching, rls, privacy, testing]
status: complete
last_updated: 2026-06-17
last_updated_by: kiro
---

# Research: Ground Risks #1, #2, #3 for Phase 1 Critical-Path Matching Tests

**Date**: 2026-06-17T10:04:53+02:00
**Researcher**: kiro
**Git Commit**: ab4adcc
**Branch**: main
**Repository**: 10xdevs

## Research Question

For each of the three risks covered by Phase 1 (silent matching failure, RLS blocks cross-user data, location privacy leak): ground the real failure path in code, quote relevant lines, verify or correct the test-plan's response guidance, locate existing tests, identify the cheapest useful test layer, and flag speculative risks or misleading hot-spot evidence.

## Summary

- **Risk #1 confirmed HIGH.** The failure path is real: `find_matches()` silently returns `[]` for multiple non-error conditions (no pin, below-threshold overlap, NULLIF edge case). The dashboard swallows RPC errors entirely. The test-plan's challenge ("if find_matches returns rows in psql, the UI will show them") is partially correct — the UI does NOT further filter results, but there are 3 ways the function returns empty without any DB error.
- **Risk #2 confirmed HIGH with ACTIVE BUG.** The test-plan's challenge ("what about direct table reads?") is validated: `matches/page.tsx:89-95` calls `createSignedUrl` on another user's photo path, which is **blocked by storage RLS**. This is a live, silent failure — matched users see cards without photos. No match-scoped RLS exception exists anywhere.
- **Risk #3 confirmed LOW (well-architected).** The function return type is clean, all walking_pins queries are own-user-scoped, and RLS enforces owner-only SELECT. `distance_bucket` is the only cross-user proximity signal and is industry-standard granularity. The test-plan's challenge ("future column addition could leak") is theoretical — a contract test is still warranted as a regression guard.

## Detailed Findings

### Risk #1: Silent Matching Failure

**Entry point:** `src/app/(protected)/(gated)/matches/page.tsx:51`

```typescript
const { data, error } = await supabase.rpc("find_matches", {
  requesting_user_id: user!.id,
});
const matches = data as Match[] | null;  // line 53 — unsafe cast
```

**Three ways find_matches() returns empty without error:**
1. **No pin for requester** → `requester_pin` CTE is empty → cross join produces zero rows → `[]` returned (but the UI pre-checks at line 25, so this is handled)
2. **Below 10% overlap** → SQL overlap filter excludes the row → `[]` (the expected boundary behavior)
3. **NULLIF zero-area edge case** (`migration:42`) → if `least(area_a, area_b) = 0` (tiny radius), NULLIF produces NULL → `>= 0.10` evaluates FALSE → silently excluded

**Empty states in UI:**
| State | Trigger | Lines |
|-------|---------|-------|
| No pin | `walkingPin === null` | 33–49 — "Set your walking area first" + CTA |
| RPC error | `error` truthy | 56–65 — generic "Something went wrong" (no retry, no details) |
| No matches | `!matches \|\| matches.length === 0` | 68–80 — "No matches yet" |

**Dashboard silent failure:** `src/app/(protected)/(gated)/dashboard/page.tsx:29` calls find_matches inside `Promise.all` but never checks `error`. Line 46: `(matchesData as {...}[] | null) ?? []` converts null (error result) to empty array silently.

**Response guidance correction:** The test-plan says "if find_matches() returns rows in psql, the UI will show them — ignores RLS, serialization, and empty-state rendering." This is **mostly correct** — the UI does not apply additional filters on the returned data. However, it should also challenge: "what if find_matches returns [] for non-obvious reasons (NULLIF edge, threshold boundary)?" The real failure path is function-returns-empty, not function-returns-data-but-UI-drops-it.

**Cheapest test layer:** Integration test that calls `find_matches()` directly against Supabase (no UI needed) with seeded overlapping/non-overlapping users. This covers the critical path. A separate contract test on the UI rendering of empty/error/populated states adds signal but is secondary.

---

### Risk #2: RLS Blocks Cross-User Data

**RLS inventory — ALL owner-only:**

| Table | Policy | Scope |
|-------|--------|-------|
| `profiles` | `profiles_select_own` | `id = auth.uid()` |
| `dogs` | `dogs_select_own` | `owner_id = auth.uid()` |
| `walking_pins` | `walking_pins_select_own` | join-based `dogs.owner_id = auth.uid()` |
| `storage.objects` | `dog_photos_select_own` | `foldername(name)[1] = auth.uid()::text` |

**No cross-user SELECT policy exists in any migration.**

**Active bug — signed URL for matched user's photo BLOCKED:**

`src/app/(protected)/(gated)/matches/page.tsx:89-95`:
```typescript
const { data } = await supabase.storage
  .from("dog-photos")
  .createSignedUrl(match.dog_photo_path, 60);  // path = "<other-user-uuid>/dog.jpg"
signedPhotoUrl = data?.signedUrl ?? null;
```

The path's first segment is the OTHER user's UUID. The storage RLS policy checks `foldername(name)[1] = auth.uid()::text` — this evaluates FALSE. The call silently returns `null`. Match cards render without photos.

**What find_matches() returns vs what the UI needs additionally:**
- The function returns: `profile_id, display_name, bio, dog_name, dog_breed, dog_photo_path, distance_bucket` — all text data. This bypasses RLS because the function is `SECURITY DEFINER`.
- The UI only needs ONE additional query: `createSignedUrl` for the photo. This query DOES hit storage RLS and fails.

**Response guidance verdict:** The test-plan's challenge ("owner-only RLS is enough because find_matches is SECURITY DEFINER — but what about direct table reads from the client outside the function?") is **VALIDATED**. The UI does make a direct storage read for another user's photo, and it fails. The "direct table read" isn't on profiles/dogs (those come from the function), but on storage — which has the same owner-only pattern.

**Cheapest test layer:** Integration test: authenticate as User A, call `createSignedUrl` for User B's photo path → assert failure. Then test whatever fix is applied (a match-scoped storage policy or a SECURITY DEFINER wrapper for photo URLs).

---

### Risk #3: Location Privacy Leak

**find_matches() return type** (`migration:6-13`):
```sql
returns table (
  profile_id uuid,
  display_name text,
  bio text,
  dog_name text,
  dog_breed text,
  dog_photo_path text,
  distance_bucket text
)
```
✅ No `lat`, `lng`, `radius_m`, or overlap percentage.

**All `.from('walking_pins')` queries in src/ — own-user-scoped:**
| Location | Line | Purpose |
|----------|------|---------|
| `matches/page.tsx` | 25 | Existence check (own pin) |
| `dashboard/page.tsx` | 25 | Own pin display |
| `walking-area/actions.ts` | 31 | Upsert own pin |
| `walking-area/page.tsx` | 15 | Load own pin |

**Client state:** `WalkingAreaClient.tsx:33-35` stores lat/lng/radius in component-local `useState`. Not in React context, not in URL params, not in localStorage.

**Match types:** `Match` interface (`matches/page.tsx:7-15`) and `MatchCardProps` (`MatchCard.tsx:6-13`) contain NO location fields.

**distance_bucket assessment:** Buckets are `nearby` (<1km), `moderate` (1-3km), `far` (>3km). Standard for location-based apps. Triangulation would require repeatedly moving one's own pin — slow and imprecise. Acceptable for a dog-walking app.

**Response guidance verdict:** The test-plan's challenge ("the function only returns safe columns — but a future column addition or direct table query could leak") is **theoretical, not currently exploitable**. However, the contract test is still warranted as a regression guard against future changes. The test should assert the SHAPE of the response (allowlist of fields) rather than just asserting specific fields are absent.

**Cheapest test layer:** Contract test asserting the TypeScript response shape matches an allowlist. This catches accidental column additions at the type level. A SQL-level test asserting the function's return columns is a belt-and-suspenders addition.

---

## Code References

- `src/app/(protected)/(gated)/matches/page.tsx:51` — find_matches RPC call
- `src/app/(protected)/(gated)/matches/page.tsx:53` — unsafe `as Match[]` cast
- `src/app/(protected)/(gated)/matches/page.tsx:89-95` — createSignedUrl for OTHER user's photo (BLOCKED)
- `src/app/(protected)/(gated)/matches/page.tsx:33-49` — empty state A (no pin)
- `src/app/(protected)/(gated)/matches/page.tsx:56-65` — error state
- `src/app/(protected)/(gated)/matches/page.tsx:68-80` — empty state B (no matches)
- `src/app/(protected)/(gated)/dashboard/page.tsx:29` — find_matches call (error swallowed)
- `src/app/(protected)/(gated)/dashboard/page.tsx:46` — silent `?? []` fallback
- `supabase/migrations/20260610092307_create_find_matches_function.sql:6-13` — return type (clean)
- `supabase/migrations/20260610092307_create_find_matches_function.sql:38-42` — 10% overlap threshold + NULLIF
- `supabase/migrations/20260610092301_create_profiles.sql:14-28` — profiles RLS (owner-only)
- `supabase/migrations/20260610092302_create_dogs.sql:16-30` — dogs RLS (owner-only)
- `supabase/migrations/20260610092303_create_dog_photos_bucket.sql:12-40` — storage RLS (owner-only)
- `supabase/migrations/20260610092304_create_walking_pins.sql:14-28` — walking_pins RLS (owner-only)
- `src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx:33-35` — own-user lat/lng state (no leak)
- `vitest.config.mts` — minimal config (jsdom, react plugin, tsconfigPaths)
- `src/__tests__/page.test.tsx` — only existing test (smoke test of home page)

## Architecture Insights

1. **SECURITY DEFINER is the only cross-user data access mechanism.** The entire schema follows owner-only RLS with zero match-scoped exceptions. `find_matches()` is the sole authorized path for seeing another user's data.

2. **Storage access is the gap.** The architecture correctly isolates text data inside the function but forgot that the UI needs to FETCH the photo binary separately — and that fetch hits storage RLS which has no match-awareness.

3. **No generated Supabase types.** `createServerClient` is called without a `Database` generic. All `.rpc()` calls return `any`. Type safety between SQL and TypeScript relies entirely on manual `interface Match` definitions that can drift.

4. **Server Components avoid client-side leak vectors.** All match-list data flows through a Server Component (no client state for other users' data). This is architecturally strong for privacy.

5. **Error handling is inconsistent.** The matches page shows a generic error card; the dashboard swallows errors silently. Neither logs the error or provides debugging information.

## Historical Context (from prior changes)

- `context/archive/2026-06-10-data-schama-and-geo/plan.md` — Explicitly documented "No changes to existing RLS policies on walking_pins (stays owner-only)" and "No cross-user SELECT policies on profiles/dogs tables (function handles access)." This was intentional at the time but created the storage gap.
- `context/archive/2026-06-10-user-and-dog-profile/plan.md` — Established the owner-only RLS convention and private bucket with `foldername(name)[1] = auth.uid()::text`. The plan noted "S-03 widens RLS to active matches" — that widening never happened.
- `context/foundation/lessons.md` — "Storage RLS must align with function-level access" lesson already captures this exact pattern (function exposes a path, storage blocks the download). This is a KNOWN issue.

## Test Infrastructure Status

| What | Status |
|------|--------|
| Test runner | vitest 4.1.7 ✅ |
| DOM env | jsdom 29.1.1 ✅ |
| React testing | @testing-library/react 16.3.2 ✅ |
| Existing tests | 1 smoke test (`src/__tests__/page.test.tsx`) |
| Setup files | None |
| API mocking (MSW) | Not installed (transitive dep only) |
| Supabase test client | None |
| Seed data | `supabase/config.toml` references `seed.sql` but file doesn't exist |
| Coverage config | None |

## Cheapest Test Strategy Per Risk

| Risk | Cheapest layer | What to test | Why not cheaper |
|------|---------------|--------------|-----------------|
| #1 | Integration (DB-level) | Seed 2 users with overlapping pins → call `find_matches()` → assert non-empty; seed non-overlapping → assert empty | Unit test can't exercise the PostGIS overlap logic; needs real SQL execution |
| #2 | Integration (Supabase client) | Authenticate as User A → `createSignedUrl` for User B's photo → assert denied; apply fix → assert allowed | RLS is enforced by Supabase, not testable with mocks |
| #3 | Contract test (type assertion) | Assert `find_matches()` response keys match allowlist `[profile_id, display_name, bio, dog_name, dog_breed, dog_photo_path, distance_bucket]` | Can be a Vitest unit test against the type/schema — no DB needed for the type check; DB-level test adds regression safety on the SQL |

## Hot-Spot Evidence Assessment

- **`src/app/(protected)/(gated)/walking-area` (9 commits/30d)** — HIGH relevance. This directory owns the pin-save logic that feeds find_matches(). Active development here increases the chance of pin-related bugs (bad validation, failed upsert) that would cause silent empty matches.
- **`src/components` (11 commits/30d)** — MEDIUM relevance. MatchCard.tsx lives here but the churn is mostly UI polish across many components. The real risk (storage RLS) lives in the page file, not the component.

## Open Questions

1. **How should storage RLS be fixed for matched users?** Options: (a) add a match-scoped storage policy checking a matches table, (b) generate signed URLs inside a SECURITY DEFINER function, (c) proxy photo access through a server route. The choice affects test design.
2. **Should the dashboard error swallowing be fixed before or during testing?** It masks real failures.
3. **Is a local Supabase instance (via `supabase start`) available for integration tests, or do tests need to hit the hosted project?** This determines the test setup complexity and CI feasibility.
4. **The NULLIF edge case (zero-area buffer for very small radii) — is the minimum radius of 200m sufficient to avoid this?** Needs mathematical verification: does `ST_Buffer(point, 200)` produce a non-zero area?
