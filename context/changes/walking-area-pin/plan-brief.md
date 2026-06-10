# Walking Area Pin — Plan Brief

> Full plan: `context/changes/walking-area-pin/plan.md`
> Research: `context/changes/walking-area-pin/research.md`

## What & Why

Dog owners need to mark where they walk so the app can match nearby dogs (S-03). This change adds a map page where the user drags a pin and sets a radius — the simplest input for "I walk my dog here."

## Starting Point

- No map library, no geo data in the schema
- `(gated)` layout pattern exists (auth + dog profile required)
- Server action upsert pattern established in profile flow
- One dog per user (MVP constraint)

## Desired End State

User visits `/walking-area` from the dashboard, sees a Leaflet map centered on Berlin with a draggable pin and radius slider. They position the pin, adjust the radius (200m–5km), and data auto-saves. On return, their saved area is restored.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Pin ownership | FK → dogs.id (one pin per dog) | Natural join target for S-03 geo-matching | Plan |
| Persistence | Auto-save with 1.5s debounce | Frictionless UX — no "did I save?" anxiety | Plan |
| Radius range | 200m–5000m, default 1000m | Covers urban walking without producing false-positive matches | Plan |
| Initial state | Berlin center [52.52, 13.405], pin pre-placed | Zero-instruction UX — user drags immediately | Plan |
| Error handling | Inline status text + retry on next interaction | Non-blocking; no toast library needed | Plan |
| Map library | Leaflet vanilla (no react-leaflet) | Smallest bundle, avoids React 19 hydration bugs | Research |
| Tiles | OSM (free, no key) | Zero cost, no quota anxiety during validation | Research |
| Schema | Simple float8 columns (not PostGIS yet) | F-02 evolves to PostGIS later; UI layer unchanged | Research |

## Scope

**In scope:**
- `walking_pins` migration with RLS
- `MapView` component (Leaflet, draggable marker, circle, slider)
- `/walking-area` page with data loading + debounced auto-save
- Server action `saveWalkingPin` (upsert)
- Dashboard "Set walking area" link

**Out of scope:**
- Geolocation API / "use my location"
- PostGIS / geo-queries (F-02)
- Multi-dog selector
- Showing other users' pins
- Custom tiles or map styling

## Architecture / Approach

```
Dashboard (link) → /walking-area (Client Component)
                        ↓ dynamic import (ssr:false)
                   MapView.tsx (Leaflet vanilla)
                        ↓ onChange (debounced)
                   saveWalkingPin server action
                        ↓ upsert
                   walking_pins table (RLS: owner only)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Database & Dependencies | `walking_pins` table, leaflet installed, icon assets | Migration timestamp collision if other changes land first |
| 2. MapView Component & Page | Rendering map with interactive pin + slider | Leaflet SSR error if dynamic import misconfigured |
| 3. Server Action & Dashboard Link | Persistence + navigation | Upsert requires dog_id lookup; edge case if dog deleted mid-session |
| 4. Final Verification | Confidence the feature works end-to-end | RLS policy correctness |

**Prerequisites:** Dog profile flow complete (user must have a `dogs` row to pass the gated layout).
**Estimated effort:** ~2 sessions across 4 phases.

## Open Risks & Assumptions

- Assumes F-02 (PostGIS schema) has NOT landed yet — if it has, Phase 1 migration needs adjustment
- No toast/notification library — using inline status text; may feel basic
- Berlin default center works for the current user base — would need revisiting for global audience

## Success Criteria (Summary)

- User can place a pin and set radius on the map, data persists across page reloads
- Dashboard provides clear navigation to the feature
- No SSR errors, no leaked data between users (RLS enforced)
