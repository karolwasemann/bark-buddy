<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Walking Area Pin

- **Plan**: context/changes/walking-area-pin/plan.md
- **Scope**: Phase 1–4 of 4
- **Date**: 2026-06-10
- **Verdict**: APPROVED (all findings resolved)
- **Findings**: 0 critical · 3 warnings · 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Missing fetch-failure error handling (retry button + disabled map)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/app/(protected)/(gated)/walking-area/page.tsx:10-20
- **Detail**: Plan explicitly required: "On fetch failure: show an error state with retry button and disable map interaction — do not render the map with defaults until fetch confirms no existing pin (prevents accidental overwrite of real data)." The Server Component page does not handle fetch errors — if the Supabase query fails, `initialData` silently stays null and the map renders at Berlin defaults, risking overwrite.
- **Fix A ⭐ Recommended**: Propagate error state to WalkingAreaClient
  - Strength: Matches plan intent. page.tsx catches query error, passes an `error` prop; client shows error UI with a retry link (full-page reload since it's a server-fetched page).
  - Tradeoff: Adds ~15 lines across two files. "Retry" becomes a page refresh rather than client-side re-fetch (trade-off of the server-fetch architecture).
  - Confidence: HIGH — standard Server Component error propagation.
  - Blind spot: None significant.
- **Fix B**: Add error.tsx boundary instead
  - Strength: Zero changes to page/client logic; Next.js handles it.
  - Tradeoff: Shows a generic error page rather than the plan's inline UX with disabled map and retry button.
  - Confidence: MEDIUM — works but doesn't match plan's UX spec.
  - Blind spot: May swallow partial errors (e.g. auth works but query fails).
- **Decision**: FIXED via Fix A

### F2 — Debounce timer not cleared on unmount

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx:26-38
- **Detail**: `timerRef` is never cleared on unmount. If user navigates away within 1500ms, the stale timeout fires — calling `saveWalkingPin` and `setStatus` on an unmounted component. React 19 won't crash but the save request is wasted and the setState is a no-op warning.
- **Fix**: Add a cleanup useEffect: `useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);`
- **Decision**: FIXED

### F3 — No try/catch around DB calls in server action

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/(protected)/(gated)/walking-area/actions.ts:15-35
- **Detail**: Existing `profile/actions.ts` wraps DB operations in try/catch and returns a generic error for network-level failures. This action only checks the Supabase `.error` response but doesn't catch thrown exceptions (network timeout, DNS failure). If the client throws, it becomes an unhandled 500.
- **Fix**: Wrap lines 15–35 in try/catch { return { error: "Unexpected error. Please try again." }; }
- **Decision**: FIXED

### F4 — "Failed — will retry" text with no actual retry

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx:74
- **Detail**: Status text says "Failed — will retry" but no retry logic exists. Next save only triggers when the user interacts again. Misleading UX.
- **Fix**: Change text to "Failed to save" (or implement actual retry).
- **Decision**: FIXED

### F5 — Structural drift: Server Component split (benign, better pattern)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/app/(protected)/(gated)/walking-area/page.tsx
- **Detail**: Plan specified a 'use client' page with client-side fetch. Implementation uses a Server Component (page.tsx) that fetches data server-side and passes to a Client Component (WalkingAreaClient.tsx). This is idiomatic Next.js App Router — eliminates the client-side fetch waterfall and leverages server rendering. Accept as improvement.
- **Fix**: No code change needed. Document in plan addendum if desired.
- **Decision**: FIXED — documented as plan addendum
