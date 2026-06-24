---
date: 2026-06-24T09:22:06+02:00
researcher: kiro
git_commit: d025ced
branch: main
repository: bark-buddy
topic: "E2E rollout phases and stack correction for test-plan.md refresh"
tags: [research, e2e, playwright, test-plan, codebase]
status: complete
last_updated: 2026-06-24
last_updated_by: kiro
---

# Research: E2E Rollout Phases and Stack Correction

**Date**: 2026-06-24T09:22:06+02:00
**Researcher**: kiro
**Git Commit**: d025ced
**Branch**: main
**Repository**: bark-buddy

## Research Question

Ground the three proposed E2E rollout phases (infra hardening, onboarding pipeline, walking-area interaction) against the live codebase. Verify what exists, what's missing, confirm correctness of the proposed stack correction, and identify blockers or adjustments for each phase.

## Summary

The test-plan.md §4 E2E row ("none yet") is **stale** — Playwright 1.61.0 is configured with 2 specs, an E2E_RULES.md, and established patterns. However, the current infra has significant gaps (manual auth, single browser, no DB seed project) that the proposed Phase 1 (infra hardening) correctly targets. All three proposed rollout phases are well-grounded in real risks. One adjustment needed: Phase 2 relies on programmatic user creation which requires the infra from Phase 1 first (correct ordering confirmed).

## Detailed Findings

### Current E2E Infrastructure State

**Playwright config** (`playwright.config.ts`):
- Version: `@playwright/test` 1.61.0 (pinned exact)
- Test dir: `./e2e`
- Browser: **Single project — Edge only** (`channel: "msedge"`)
- Auth: Global `storageState: "auth.json"` (manual generation)
- Parallelism: `fullyParallel: true` locally, `workers: 1` in CI
- Reporter: HTML
- webServer: `npm run dev` on port 3000
- No setup project, no global-setup/teardown
- Scripts: `test:e2e`, `test:e2e:ui`

**Existing specs** (`e2e/`):

| File | Tests | Status |
|------|-------|--------|
| `seed.spec.ts` | 2 (profile persistence, unauth redirect) | Reference exemplar |
| `match-list-renders.spec.ts` | 2 (match cards render, empty state SKIPPED) | Risk #1 coverage |
| `E2E_RULES.md` | — | Conventions doc |

**auth.json** — Referenced but NOT on disk. Must be manually generated via:
```
npx playwright codegen --save-storage=auth.json http://localhost:3000
```

### Gap Analysis for Proposed Phases

#### Phase 1: E2E Infra Hardening

| Proposed goal | Current state | Gap severity |
|---|---|---|
| Automated auth setup project | Manual auth.json, no setup project | **Critical** — tests fail if auth.json expires |
| Env-based credentials | Hardcoded `test@test.de` in seed.spec.ts:13 | Medium — works locally but blocks CI |
| Multi-browser (Chrome + Firefox + Edge) | Edge only | Low — cosmetic until CI exists |
| E2E seeding helper pattern | No helpers in e2e/, data assumed pre-seeded | **Critical** — tests depend on dev DB state |

**Evidence for criticality:**
- `seed.spec.ts:13`: `// contains auth cookie for test@test.de`
- `playwright.config.ts:16`: `storageState: "auth.json"` (file doesn't exist on disk)
- `match-list-renders.spec.ts` assumes overlapping match data exists — if dev DB is reset, test fails
- E2E_RULES.md:21-24 requires "self-contained: own setup, action, assertion, cleanup" but current specs violate this (no setup/cleanup)

**Playwright setup project pattern needed:**
```
projects: [
  { name: "auth-setup", testMatch: /auth\.setup\.ts/ },
  { name: "chromium", dependencies: ["auth-setup"], ... },
  { name: "firefox", dependencies: ["auth-setup"], ... },
  { name: "edge", dependencies: ["auth-setup"], ... },
]
```

#### Phase 2: Onboarding Pipeline E2E

**Risk E1 (pipeline breakage):** The full chain is: register → profile → dog → walking-area pin → dashboard → match list.

**Relevant routes and gating logic:**

| Route | Gating | File |
|---|---|---|
| `/register` | Public | `src/app/(auth)/register/page.tsx` |
| `/profile` | Auth + profile exists | `src/app/(protected)/(gated)/profile/` |
| `/profile/dog` | Auth + profile exists | `src/app/(protected)/(gated)/profile/dog/` |
| `/walking-area` | Auth + profile + dog exists | `src/app/(protected)/(gated)/walking-area/` |
| `/dashboard` | Auth + profile + dog + pin exists | `src/app/(protected)/(gated)/dashboard/` |
| `/matches` | Auth + profile + dog + pin exists | `src/app/(protected)/(gated)/matches/` |

**Gating mechanism:** `(gated)` layout checks completeness — if any step missing, redirects to the incomplete step. This is THE risk E1 targets: each form works in isolation but redirect/gating logic breaks the chain.

**Risk E2 (empty matches after fresh onboarding):** Requires a freshly-created user to complete the full chain AND see matches. This proves the pipeline isn't just navigation — it produces a matchable user.

**Prerequisite:** Phase 1 must provide programmatic user creation (auth.setup pattern + seed helper) so Phase 2 can create fresh users with `Date.now()` suffix per run.

#### Phase 3: Walking-Area Interaction E2E

**Risk E4 (auto-save failure):** Pin drag → debounce → save → reload persistence.

**Implementation found:**
- `src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx` — client component with Leaflet map
- `src/app/(protected)/(gated)/walking-area/actions.ts:31` — `upsertWalkingPin` server action
- Debounce logic: client-side before calling server action

**Key test challenge:** Waiting for debounce without `waitForTimeout`. The E2E test must wait for save confirmation signal (toast? network response? re-fetch?) rather than a timer.

**Possible wait strategies:**
1. `waitForResponse()` matching the server action endpoint
2. Wait for a success indicator (toast, saved-state icon)
3. `page.route()` won't work — server actions are server-side

**Reload persistence check:** After save completes → `page.reload()` → assert pin position matches. This pattern is already demonstrated in `seed.spec.ts` (reload → re-assert).

### Stack Correction Details

**Current §4 E2E row:**
```
| e2e | none yet — see Phase 5 | — | Playwright recommended if e2e gate is justified after Phase 4 |
```

**Corrected row should be:**
```
| e2e | Playwright | 1.61.0 | testDir: ./e2e, Edge-only (msedge channel), storageState auth (manual), webServer: npm run dev, 2 specs + E2E_RULES.md |
```

**Additional corrections from change.md:**
- §3: Append E2E rollout phases 6-8 after current Phase 5
- §7: Add "Leaflet pixel rendering" to negative-space list

### E2E Rules and Pattern Compliance

Rules from `e2e/E2E_RULES.md` that constrain the rollout phases:

1. **Locators:** getByRole > getByLabel > getByText > getByTestId, never CSS/XPath
2. **Waits:** Never `waitForTimeout`; use `toBeVisible`, `waitForURL`, `waitForResponse`
3. **Independence:** Each test self-contained with unique IDs (`Date.now()` suffix)
4. **Auth:** `storageState` pattern, never UI login
5. **File convention:** One test per file, provenance header linking to risk
6. **Real boundaries:** auth, routing, Supabase DB, RLS stay real
7. **Anti-patterns:** hallucinated assertion, brittle selector, shared state, wait-for-time, no cleanup

**Current spec compliance:**

| Rule | seed.spec.ts | match-list-renders.spec.ts |
|------|---|---|
| Locators | ✅ getByRole primary | ✅ getByRole primary |
| Waits | ✅ toBeVisible, waitForURL | ✅ toBeVisible |
| Independence | ⚠️ No setup/cleanup (read-only) | ⚠️ No setup (depends on DB state) |
| Auth | ✅ storageState | ✅ storageState |
| Provenance | ✅ Risk linked in comments | ✅ Risk #1 linked |
| Anti-patterns | ✅ Clean | ⚠️ `page.locator("article, [data-slot='card']")` is borderline |

### Lessons.md Relevance

From `context/foundation/lessons.md`:
- **"Storage RLS must align with function-level access"** — directly relevant to Phase 2 (matched user needs photo access). The existing storage RLS bug must be fixed before E2E Phase 2 can assert photo rendering.

## Code References

- `playwright.config.ts:1-35` — Full Playwright config (single Edge browser, storageState auth)
- `e2e/seed.spec.ts:1-72` — Reference exemplar spec (auth pattern, reload persistence, unauth redirect)
- `e2e/match-list-renders.spec.ts:1-65` — Risk #1 E2E coverage (match cards, privacy negative assertions)
- `e2e/E2E_RULES.md:1-56` — E2E conventions (locators, waits, independence, anti-patterns)
- `package.json` — `@playwright/test: 1.61.0`, scripts: `test:e2e`, `test:e2e:ui`
- `src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx:33-35` — Pin state (lat/lng)
- `src/app/(protected)/(gated)/walking-area/actions.ts:31` — upsertWalkingPin server action

## Architecture Insights

1. **Auth infra is the critical blocker.** Without automated auth setup, all E2E phases are fragile. The manual `auth.json` approach doesn't scale to multi-user scenarios (Phase 2 needs fresh users) and breaks silently when sessions expire.

2. **The gating layout is the E2E sweet spot.** The `(gated)` route group's redirect logic is exactly what can't be tested at integration level — it requires a real browser navigating between routes and observing redirects. This validates Phase 2's focus.

3. **Server actions complicate E2E waits.** Walking-area pin save uses a server action (not a REST endpoint), so `waitForResponse` targeting a specific URL may not work. The test needs to wait for an observable UI state change after the action completes.

4. **Current specs are read-only.** Both existing specs assert existing state without creating/modifying data. Phase 2 and 3 require write operations (user creation, pin placement), which is a significant escalation in complexity requiring the seeding infra from Phase 1.

## Historical Context (from prior changes)

- `context/changes/testing-critical-path-matching/research.md` — Grounded Risks #1-#3 at integration level. Found the active storage RLS bug. Established that `find_matches()` is SECURITY DEFINER and the sole cross-user data path.
- `context/changes/testing-critical-path-matching/plan.md` — Built integration test infrastructure (vitest workspace, supabase helpers, seed factories). Phase 1 is complete with 2 storage tests skipped pending RLS fix.
- `context/foundation/lessons.md` — Storage RLS alignment lesson applies to E2E Phase 2 (matched user photo rendering).

## Rollout Phase Feasibility Assessment

| Phase | Feasibility | Blockers | Estimated complexity |
|---|---|---|---|
| 1: Infra hardening | ✅ Ready to start | None — purely additive | Medium (auth setup project + seed helper + multi-browser config) |
| 2: Onboarding pipeline | ⚠️ Needs Phase 1 | Auth setup project required for fresh user creation | High (full registration flow + multi-step navigation) |
| 3: Walking-area interaction | ⚠️ Needs Phase 1 | Auth setup + seed helper for pin-ready user; debounce wait strategy TBD | Medium (single page interaction, but Leaflet complicates coordinates) |

## Open Questions

1. **Debounce wait strategy for Phase 3:** How does the walking-area indicate save success? Is there a toast, a status indicator, or only the network response? This determines how the E2E test waits without `waitForTimeout`.
2. **Multi-user auth for Phase 2:** Should the auth setup project create multiple storageState files (one per role/scenario), or should each test create its own user programmatically via Supabase admin API?
3. **Storage RLS fix timeline:** Phase 2's "match cards render with photos" assertion depends on the storage RLS bug being fixed. Is this fix planned before E2E Phase 2 starts?
4. **CI considerations:** Phase 1 proposes multi-browser — but no CI exists yet (Phase 5 in test-plan). Should multi-browser be deferred until CI is ready, or run locally first?
