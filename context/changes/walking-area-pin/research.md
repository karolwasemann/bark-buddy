---
date: "2026-06-10T10:52:28+02:00"
researcher: kiro
git_commit: e43e713a0c491fb26f702186a8fe8ad95582d75e
branch: main
repository: bark-buddy
topic: "Verify docs.md compatibility with codebase for S-02 walking-area-pin"
tags: [research, codebase, leaflet, next-dynamic, walking-area-pin, s-02]
status: complete
last_updated: "2026-06-10"
last_updated_by: kiro
---

# Research: docs.md Compatibility with Codebase for S-02

**Date**: 2026-06-10T10:52:28+02:00
**Researcher**: kiro
**Git Commit**: e43e713a0c491fb26f702186a8fe8ad95582d75e
**Branch**: main
**Repository**: bark-buddy

## Research Question

Is `context/changes/walking-area-pin/docs.md` compatible with the current codebase? Can S-02 be implemented as documented?

## Summary

**docs.md is compatible** with the codebase. All proposed patterns align with existing conventions and Next.js 16.2.6 APIs. One nuance requires attention (the `ssr: false` + Client Component rule) and one dependency gap exists (pin data storage needs a migration). No blockers found.

## Detailed Findings

### 1. `next/dynamic` with `ssr: false` — ✅ Compatible

**Evidence:** `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` explicitly shows:

```jsx
const ComponentC = dynamic(() => import('../components/C'), { ssr: false })
```

**Constraint from docs (lines 37–39):**
> `ssr: false` option is not supported in Server Components. You will see an error if you try to use it in Server Components. Please move it into a Client Component.

**docs.md proposes:**
```tsx
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('@/components/MapView').then(m => m.MapView), { ssr: false });
```

**Compatibility:** The dynamic import with `ssr: false` MUST live in a file with `'use client'` at the top. The page that hosts the map must be a Client Component.

**Existing pattern:** `src/app/(protected)/profile/new/page.tsx:1` is already `"use client"` — so placing the map page under `(gated)` with `'use client'` is a proven pattern in this codebase.

### 2. Database Schema — ⚠️ Migration Needed

**Current schema** (from `supabase/migrations/`):
- `profiles` — id, display_name, bio, created_at
- `dogs` — id, owner_id, name, breed, photo_path, created_at

**No `walking_pins` table exists.** No columns for lat/lng/radius anywhere.

**docs.md proposes:**
```typescript
interface WalkingAreaPin { lat: number; lng: number; radius_m: number; }
```

**Roadmap says** F-02 (`data-schema-and-geo`, status: `ready`) will create the pins table with PostGIS. S-02 needs to either:
1. **Option A:** Create a simple `walking_pins` migration as part of S-02 (lat float8, lng float8, radius_m numeric) — works without PostGIS.
2. **Option B:** Depend on F-02 being done first — gets PostGIS `geography(Point)` column.

**Recommendation:** Option A for S-02 (simple float columns + RLS). F-02 can later migrate to PostGIS geography without breaking the UI layer, since the component only deals in `{lat, lng, radius_m}` numbers.

### 3. Project Structure Fit — ✅ Compatible

| docs.md proposes | Codebase convention | Verdict |
|---|---|---|
| `src/components/MapView.tsx` | Components live in `src/components/` (ui/ subfolder for primitives) | ✅ Correct location |
| Map page under `(gated)` | `src/app/(protected)/(gated)/dashboard/page.tsx` exists | ✅ Follows pattern |
| `@/components/MapView` import | `tsconfig.json` has `"@/*": ["./src/*"]` | ✅ Path alias works |
| Named export `MapView` | Project uses named exports for components (per AGENTS.md) | ✅ Convention match |
| Tailwind classes for styling | AGENTS.md mandates Tailwind utility classes only | ✅ `className="h-96 w-full rounded-lg"` |

**Route placement:** New page at `src/app/(protected)/(gated)/walking-area/page.tsx`. The `(gated)` layout already enforces auth + completed profile.

### 4. Dependency Compatibility — ✅ Compatible

**Leaflet is NOT installed.** Required:
```bash
npm install leaflet
npm install -D @types/leaflet
```

**No conflicts** with existing deps:
- React 19.2.4 ✅ (Leaflet is DOM-only, no React integration needed)
- Next.js 16.2.6 ✅ (dynamic import with ssr:false proven)
- TypeScript 5 ✅ (@types/leaflet provides full type coverage)
- No `react-leaflet` needed ✅ (docs.md correctly avoids it)

**Leaflet CSS:** `import 'leaflet/dist/leaflet.css'` in the Client Component works — Next.js supports CSS imports in client components.

**Marker icons:** Copy from `node_modules/leaflet/dist/images/` → `public/leaflet/`. The `public/` directory exists.

### 5. `onPinChange` Prop — ⚠️ Minor Gap

docs.md proposes:
```tsx
export function MapView({ onPinChange }: { onPinChange: (lat: number, lng: number) => void })
```

**Missing `radius_m`** in the callback. The slider controls radius, so the parent needs all three values to persist. Should be:
```tsx
onPinChange: (lat: number, lng: number, radius_m: number) => void
```

### 6. Leaflet API Usage — ✅ Correct

All Leaflet APIs in docs.md are accurate:
- `L.map(id)` / `.setView()` — correct
- `L.tileLayer(url, opts)` — correct OSM URL pattern
- `L.marker(latlng, { draggable: true })` — correct
- `L.circle(latlng, { radius: n })` — radius in meters, correct
- `marker.on('dragend', cb)` — correct event API
- `map.remove()` in useEffect cleanup — correct, prevents memory leaks

## Code References

- `src/app/(protected)/(gated)/layout.tsx:1-26` — Gated layout with profile gate
- `src/app/(protected)/profile/new/page.tsx:1` — `"use client"` page precedent
- `src/components/ui/` — Component organization pattern
- `supabase/migrations/20260610092301_create_profiles.sql` — Current schema (no pin table)
- `supabase/migrations/20260610092302_create_dogs.sql` — Dogs table (owner_id FK)
- `tsconfig.json:18` — `@/*` path alias
- `package.json` — No leaflet in deps yet
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:37-39` — ssr:false constraint

## Architecture Insights

- **Pattern:** Pages under `(gated)` can be Server or Client Components. Map page will be Client Component (like profile/new).
- **Data flow:** Persist `{lat, lng, radius_m}` via a server action (pattern from `profile/actions.ts`). Upsert to `walking_pins` table.
- **RLS:** New table needs owner-scoped RLS (same pattern as profiles + dogs migrations).
- **Lesson from `lessons.md`:** Don't cast `formData.get()` as string — use `?.toString() ?? ""`.

## Historical Context

- `context/changes/walking-area-pin/map-lib-research.md` — Prior external research establishing Leaflet + OSM as the library choice.
- `context/archive/2026-06-10-user-and-dog-profile/plan.md` — Pattern for migrations, server actions, Client Component pages.

## Open Questions

1. **Should S-02 create its own `walking_pins` migration, or wait for F-02?**
   - Recommendation: Simple migration now (float columns). F-02 evolves to PostGIS later.
2. **Should `onPinChange` include `radius_m`?**
   - Yes — parent needs all three values to persist.
3. **Default map center — hardcode Warsaw `[52.23, 21.01]` or use geolocation?**
   - Hardcode for MVP; geolocation is a later enhancement.
