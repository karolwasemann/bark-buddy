<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Walking Area Pin

- **Plan**: context/changes/walking-area-pin/plan.md
- **Mode**: Deep
- **Date**: 2026-06-10
- **Verdict**: REVISE
- **Findings**: 1 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding

5/5 paths ✓, 3/3 symbols ✓, brief↔plan ✓

## Findings

### F1 — Phase ordering breaks build

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 → Phase 3 boundary
- **Detail**: Phase 2's page.tsx imports `saveWalkingPin` from `./actions`, but `actions.ts` is only created in Phase 3. The plan states each phase is "independently verifiable" with `npm run build` as a success criterion — Phase 2 will fail that check. The codebase always co-locates action files with their consumers in the same phase (profile/new/page.tsx + profile/actions.ts ship together; layout.tsx + actions.ts ship together).
- **Decision**: FIXED — actions.ts moved into Phase 2; Phase 3 is now dashboard link only

### F2 — No error handling for initial pin fetch failure

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2 — Walking Area Page
- **Detail**: The plan describes error handling for *saves* (inline status, retry on next interaction) but not for the initial *fetch* of existing pin data on mount. If the fetch fails (network error, RLS issue), the page falls through to the Berlin default. The user then interacts with the map, triggering a save that overwrites their real pin with the default coordinates.
- **Fix**: Add a contract note to Phase 2's page spec: on fetch failure, show an error state and disable map interaction until retry succeeds (or at minimum, block auto-save until fetch confirms "no existing pin" vs "fetch failed").
- **Decision**: FIXED — added error-state + disable-map contract note to Phase 2 page spec

### F3 — Leaflet CSS import may cause flash of unstyled map

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2 — MapView Component
- **Detail**: Importing `leaflet/dist/leaflet.css` inside the dynamically-loaded MapView means the stylesheet arrives only after the JS chunk loads. On slow connections, the map tiles may render before styling applies (mis-positioned controls, unstyled zoom buttons). This is cosmetic and brief.
- **Fix**: Accept as-is for MVP. If noticeable, move the CSS import to a `<link>` in the page's `<head>` via next/head or metadata.
- **Decision**: FIXED — added fallback note to MapView contract in plan
