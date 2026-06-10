<!-- PLAN-REVIEW-REPORT -->
# Plan Review: UX Enhancement Implementation Plan

- **Plan**: context/changes/ui-ux-enhancment/plan.md
- **Mode**: Deep
- **Date**: 2026-06-10
- **Verdict**: SOUND (after fixes)
- **Findings**: 1 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS (after fix) |
| Blind Spots | PASS (after fix) |
| Plan Completeness | PASS (after fix) |

## Grounding

8/8 paths ✓, 6/6 symbols ✓, brief↔plan ✓

## Findings

### F1 — Pulsing pin via Tailwind impossible on Leaflet marker

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 5, Change 1 — "Add pulsing pin + instruction text"
- **Detail**: Plan said "Pulsing effect via Tailwind `animate-pulse` on a wrapper or via CSS on the marker." But `MapView.tsx` creates the marker imperatively with `L.marker()` — a Leaflet DOM element outside React's tree. Tailwind classes cannot be applied.
- **Fix A ⭐ Recommended**: Use L.divIcon with custom CSS class for pulsing animation defined in globals.css. MapView accepts optional `markerClassName` prop.
  - Strength: DivIcon with custom CSS is the standard Leaflet approach for animated markers.
  - Tradeoff: Requires modifying MapView API slightly.
  - Confidence: HIGH — standard Leaflet pattern.
  - Blind spot: Marker visual styling needs to match default pin appearance.
- **Fix B**: Add pulsing overlay around the map container instead.
  - Strength: No MapView API change.
  - Tradeoff: Less precise UX signal — doesn't highlight the actual pin.
  - Confidence: MEDIUM.
  - Blind spot: Overlay z-index vs Leaflet tiles interaction untested.
- **Decision**: FIXED (Fix A) — Plan updated to use L.divIcon with custom CSS class.

### F2 — First-visit detection via exact coord comparison is fragile

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 5, Change 1 — first visit detection
- **Detail**: Plan relied on comparing against default coords (52.52, 13.405). The parent page already knows if user has a DB row. Float comparison is fragile (false positive for users in central Berlin).
- **Fix**: Pass `isFirstVisit={!initialData}` boolean prop from page.tsx.
- **Decision**: FIXED — Combined with F1 fix. Plan now uses isFirstVisit prop.

### F3 — Plan states wrong current redirect target

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 5, Change 4 — "Redirect profile creation to walking area"
- **Detail**: Plan said redirect was from `/dashboard` but actual code at `actions.ts:84` redirects to `/profile`.
- **Fix**: Update plan text to say "from `/profile`".
- **Decision**: FIXED — Plan corrected to reference `/profile`.

### F4 — lessons.md documents redundant getUser() — dashboard Phase 4 adds another

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 4 — Dashboard Enrichment
- **Detail**: lessons.md documents "Redundant getUser() round-trips across layout + page" as known debt. Phase 4 continues this pattern. Accepted for MVP.
- **Fix**: Acknowledge as known pattern. No plan change needed.
- **Decision**: ACCEPTED — Known MVP tradeoff documented in lessons.md.
