# Walking Area Pin Implementation Plan

## Overview

Implement a gated page where a dog owner places a draggable pin on a Leaflet/OSM map and sets a walking radius via slider. Data auto-saves (debounced upsert) to a new `walking_pins` table keyed to the dog. A dashboard link provides navigation to the feature.

## Current State Analysis

- No map library installed; no geo data in the schema
- `(gated)` layout enforces auth + dog profile — proven pattern for protected pages
- Server actions use `createClient` from `@/lib/supabase/server`, upsert with `onConflict`, return `{error}` state
- Migrations follow: table + RLS (select/insert/update own), check constraints, UUID PKs, FK cascades
- No toast/notification component exists — will use simple inline status text

### Key Discoveries:

- `src/app/(protected)/(gated)/layout.tsx:1-26` — checks auth + dog; redirects if missing
- `src/app/(protected)/profile/actions.ts` — upsert pattern with `onConflict: "id"`
- `supabase/migrations/20260610092302_create_dogs.sql` — `owner_id` unique constraint, RLS pattern
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:37-39` — `ssr: false` must be in Client Component
- `src/lib/supabase/client.ts` — browser Supabase client via `createBrowserClient`

## Desired End State

- `/walking-area` page renders a full-width Leaflet map with a draggable pin and visible radius circle
- Radius slider (200m–5000m, default 1000m) updates the circle in real-time
- Pin position + radius auto-saves after 1.5s of inactivity via debounced server action
- Returning users see their saved pin position and radius restored
- Dashboard has a "Set walking area" link navigating to the page
- `walking_pins` table stores `{dog_id, lat, lng, radius_m}` with owner-scoped RLS

## What We're NOT Doing

- Geolocation API / "use my location" button (later enhancement)
- PostGIS geography column (F-02 will evolve the schema)
- Multi-dog pin selection UI (MVP = one dog per user)
- Showing other users' pins on the map
- Custom map styling or alternative tile providers

## Implementation Approach

Bottom-up: migration → component → page → server action → dashboard link. Each phase is independently verifiable. The map component is a vanilla Leaflet wrapper (no `react-leaflet`) loaded via `next/dynamic` with `ssr: false`.

## Phase 1: Database & Dependencies

### Overview

Create the `walking_pins` table, install Leaflet, and set up marker icon assets.

### Changes Required:

#### 1. Walking Pins Migration

**File**: `supabase/migrations/20260610092304_create_walking_pins.sql`

**Intent**: Create `walking_pins` table with one row per dog, storing lat/lng as float8 and radius as integer. Owner-scoped RLS following the `dogs` table pattern.

**Contract**: Table `public.walking_pins` with columns `id uuid PK`, `dog_id uuid unique FK → dogs.id on delete cascade`, `lat float8 not null`, `lng float8 not null`, `radius_m integer not null default 1000 check (radius_m between 200 and 5000)`, `created_at timestamptz`, `updated_at timestamptz`. RLS policies: select/insert/update own (join through `dogs.owner_id = auth.uid()`).

#### 2. Install Leaflet

**File**: `package.json`

**Intent**: Add `leaflet` runtime dependency and `@types/leaflet` dev dependency.

**Contract**: `npm install leaflet@1 && npm install -D @types/leaflet`

#### 3. Marker Icon Assets

**File**: `public/leaflet/marker-icon.png`, `public/leaflet/marker-icon-2x.png`, `public/leaflet/marker-shadow.png`

**Intent**: Copy default Leaflet marker images to `public/` so the icon fix (`L.Icon.Default.mergeOptions`) works with Next.js bundling.

**Contract**: Files copied from `node_modules/leaflet/dist/images/` into `public/leaflet/`.

### Success Criteria:

#### Automated Verification:

- Migration SQL is valid: `supabase db reset` applies without error
- `npm install` completes without conflicts
- `npm run build` passes (no type errors from new dep)
- `npm run lint` passes

#### Manual Verification:

- `walking_pins` table exists in Supabase Studio with correct columns and RLS policies
- Marker icon files are accessible at `/leaflet/marker-icon.png` via dev server

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: MapView Component & Walking Area Page

### Overview

Build the Leaflet map component with draggable pin + radius circle, create the `/walking-area` page that loads existing data and debounce-saves changes.

### Changes Required:

#### 1. MapView Component

**File**: `src/components/MapView.tsx`

**Intent**: Client Component wrapping Leaflet. Renders a map (OSM tiles), a draggable marker, and a circle overlay. Accepts initial position/radius as props and calls `onChange` with `{lat, lng, radius_m}` on drag-end or radius change.

**Contract**: Named export `MapView` with props:
```ts
{
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  onChange: (lat: number, lng: number, radius_m: number) => void;
}
```
Includes `'use client'`, imports `leaflet/dist/leaflet.css`, sets `L.Icon.Default.mergeOptions` pointing to `/leaflet/` assets. Cleanup via `map.remove()` in useEffect return. Note: if flash of unstyled controls is noticeable, move `leaflet/dist/leaflet.css` to a `<link>` in the page's metadata export instead of importing inside the component.

#### 2. Server Action

**File**: `src/app/(protected)/(gated)/walking-area/actions.ts`

**Intent**: `saveWalkingPin` server action that upserts `{lat, lng, radius_m}` for the authenticated user's dog. Validates bounds (lat -90..90, lng -180..180, radius 200..5000). Returns `{error?: string}`.

**Contract**: `'use server'` function signature:
```ts
export async function saveWalkingPin(lat: number, lng: number, radius_m: number): Promise<{ error?: string }>
```
Uses `createClient` from `@/lib/supabase/server`. Gets user via `getUser()`, fetches their dog_id, upserts to `walking_pins` with `onConflict: "dog_id"`. Defensive: `?.toString()` not needed here (numeric args), but validate ranges before DB call.

#### 3. Walking Area Page

**File**: `src/app/(protected)/(gated)/walking-area/page.tsx`

**Intent**: Client Component page that fetches the user's existing pin data from Supabase on mount, renders the map via `next/dynamic` (ssr: false), a radius slider, and auto-saves changes with a 1.5s debounce. Shows inline save status ("Saving…" / "Saved" / "Failed — will retry").

**Contract**: `'use client'` page. Dynamic import of `MapView` with `ssr: false`. Uses `createClient` from `@/lib/supabase/client` to fetch existing pin on mount (query `walking_pins` joined through `dogs` where `owner_id`). Calls server action `saveWalkingPin` on debounced change. Default center: `[52.52, 13.405]` (Berlin). Slider: HTML `<input type="range" min={200} max={5000} step={100}>`. On fetch failure: show an error state with retry button and disable map interaction — do not render the map with defaults until fetch confirms no existing pin (prevents accidental overwrite of real data).

### Success Criteria:

#### Automated Verification:

- `npm run build` passes (component types check, dynamic import resolves, server action types check)
- `npm run lint` passes
- `npm run test` passes (if unit tests are added for debounce logic)

#### Manual Verification:

- Map renders at `/walking-area` with Berlin center and pin
- Pin is draggable; circle moves with pin
- Slider changes circle radius in real-time
- No console errors about Leaflet/window/SSR

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Dashboard Link

### Overview

Add navigation from the dashboard to the walking area page.

### Changes Required:

#### 1. Dashboard Link

**File**: `src/app/(protected)/(gated)/dashboard/page.tsx`

**Intent**: Add a "Set walking area" link below the existing profile link, using `next/link` (per lessons.md — no raw `<a>` for internal routes).

**Contract**: Add `<Link href="/walking-area">` with same styling pattern as existing profile link.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- `npm run lint` passes

#### Manual Verification:

- Click "Set walking area" on dashboard → navigates to `/walking-area`
- Drag pin + wait → "Saved" status appears
- Refresh page → pin and radius are restored from DB
- Network error simulation → "Failed — will retry" message, next interaction retries

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Final Verification

### Overview

End-to-end check that the full feature works correctly as an integrated whole.

### Changes Required:

No new code. This phase is verification-only.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes cleanly
- `npm run lint` passes with zero warnings
- `npm run test` passes

#### Manual Verification:

- Full flow: Login → Dashboard → "Set walking area" → drag pin → adjust slider → auto-saves → refresh → data persists
- New user flow: first visit shows Berlin center with default pin; save works on first interaction
- RLS: pin data not accessible when querying as a different user
- No regressions on existing dashboard/profile pages

---

## Testing Strategy

### Unit Tests:

- Debounce utility (if extracted): verify delay behavior and cancellation
- `saveWalkingPin` validation: reject out-of-bounds lat/lng/radius

### Integration Tests:

- Page renders without SSR errors (can verify via build passing)
- Server action returns error for unauthenticated calls

### Manual Testing Steps:

1. Visit `/walking-area` as a new user — pin at Berlin center, radius 1000m
2. Drag pin to a new location — circle follows
3. Move slider — circle resizes in real-time
4. Wait 1.5s — "Saved" status appears
5. Refresh page — pin and radius restored
6. Simulate offline (DevTools) → drag pin → "Failed — will retry" message
7. Go back online → next interaction saves successfully

## Performance Considerations

- Leaflet bundle (~40KB gzipped) loaded only on `/walking-area` via dynamic import — no impact on other pages
- Debounce (1.5s) prevents write storms during rapid slider/drag interactions
- Single DB row per dog (upsert) — no unbounded growth

## Migration Notes

- `walking_pins` uses simple `float8` columns for lat/lng. F-02 will later add a PostGIS `geography(Point)` column for geo-queries — the UI layer won't change since it only deals in `{lat, lng}` numbers.
- If F-02 runs before S-02, adjust migration to add `radius_m` column to whatever table F-02 creates instead of a new table. Current plan assumes F-02 has not run yet.

## References

- Research: `context/changes/walking-area-pin/research.md`
- External docs: `context/changes/walking-area-pin/docs.md`
- Library research: `context/changes/walking-area-pin/map-lib-research.md`
- Archived profile plan: `context/archive/2026-06-10-user-and-dog-profile/plan.md`
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database & Dependencies

#### Automated

- [x] 1.1 Migration applies cleanly: `supabase db reset` — 55b5423
- [x] 1.2 `npm install` completes without conflicts — 55b5423
- [x] 1.3 `npm run build` passes — 55b5423
- [x] 1.4 `npm run lint` passes — 55b5423

#### Manual

- [x] 1.5 `walking_pins` table visible in Supabase Studio with correct columns and RLS — 55b5423
- [x] 1.6 Marker icon files accessible at `/leaflet/marker-icon.png` — 55b5423

### Phase 2: MapView Component & Walking Area Page

#### Automated

- [x] 2.1 `npm run build` passes — 2923c33
- [x] 2.2 `npm run lint` passes — 2923c33
- [x] 2.3 `npm run test` passes — 2923c33

#### Manual

- [x] 2.4 Map renders at `/walking-area` with Berlin center and pin — 2923c33
- [x] 2.5 Pin is draggable; circle moves with pin — 2923c33
- [x] 2.6 Slider changes circle radius in real-time — 2923c33
- [x] 2.7 No console errors about Leaflet/window/SSR — 2923c33

### Phase 3: Dashboard Link

#### Automated

- [x] 3.1 `npm run build` passes — d40b064
- [x] 3.2 `npm run lint` passes — d40b064

#### Manual

- [x] 3.3 Dashboard "Set walking area" link navigates to `/walking-area` — d40b064
- [x] 3.4 Drag pin + wait → "Saved" status appears — d40b064
- [x] 3.5 Refresh → pin and radius restored from DB — d40b064
- [x] 3.6 Network error → "Failed — will retry" message, next interaction retries — d40b064

### Phase 4: Final Verification

#### Automated

- [x] 4.1 `npm run build` passes cleanly
- [x] 4.2 `npm run lint` passes with zero warnings
- [x] 4.3 `npm run test` passes

#### Manual

- [x] 4.4 Full flow: Login → Dashboard → Set walking area → drag → slider → saves → refresh → persists
- [x] 4.5 New user flow: Berlin center, default pin, first save works
- [x] 4.6 RLS: data not accessible as different user
- [x] 4.7 No regressions on dashboard/profile pages
