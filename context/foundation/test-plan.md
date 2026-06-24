# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-17

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the risk wins. Do not promote to e2e because e2e "feels safer." Do not put a vision model on top of a deterministic visual diff that already catches the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team is worried about X, and the failure would surface somewhere in area Y" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what could fail* and *why we believe it's likely* — drawn from documents, interview, and codebase *signal* (churn, structure, test base). It does NOT claim to know which line owns the failure. That knowledge is produced by `/10x-research` during each rollout phase. If the plan and research disagree about where the failure lives, research is the ground truth.

Hot-spot scope used for likelihood weighting: `src/`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by risk = impact × likelihood. Risks are failure scenarios in user/business terms, not test names. The Source column cites the *evidence that surfaced this risk* — never a specific file as "where the failure lives" (that is research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | Silent matching failure — user completes onboarding (profile + dog + pin), opens match list, sees zero results despite overlapping users existing in the DB | High | High | Interview Q1; PRD US-01 AC ("empty match list shows explanatory empty-state"); hot-spot dir `src/app/(protected)/(gated)/walking-area` — 9 commits/30d; `find_matches()` is first `.rpc()` call in codebase |
| 2 | RLS silently blocks cross-user data — a query that should return another user's profile/dog/photo for a matched user returns empty because RLS policies are owner-only without a match-scoped exception | High | High | Interview Q3a (copy-paste RLS joins not understood); archived plan `data-schema-and-geo` confirms "RLS: owner-only everywhere, no cross-user reads"; roadmap S-03 requires match-scoped read |
| 3 | Location privacy leak — another user's exact pin coordinates, radius, or overlap percentage exposed through API response, client state, or network payload | High | Medium | PRD NFR "privacy lokalizacji" (strong); PRD US-01 AC "exact pin coordinates NEVER displayed"; archived plan: function is SECURITY DEFINER with curated return type |
| 4 | Session expiry mid-flow — proxy fails to refresh an expired Supabase token; user gets silently logged out or receives a 401 on a protected action without clear recovery | Medium | Medium | Interview Q3b (proxy feels opaque); tech-stack: Next.js 16 proxy is breaking rename from middleware.ts; archived auth plan: "sessions won't refresh without proxy" |
| 5 | Walk-invitation state corruption — invitation sent but recipient never sees it, acceptance doesn't unlock free-text, or double-send creates duplicate threads | High | Medium | PRD FR-008/013/014 (structured invitation gates first contact); roadmap S-04 is next proposed slice with no implementation yet |
| 6 | Dog photo access beyond match boundary — a non-matched or logged-out user accesses a dog photo URL via guessable path, leaked signed URL, or missing Storage RLS | Medium | Medium | PRD NFR "privacy zdjęć psa"; archived user-and-dog-profile plan: private bucket + signed URLs; hot-spot dir `src/components` — 11 commits/30d |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|---|---|---|---|---|---|
| #1 | Two users with overlapping circles → match list returns the other user; two users with non-overlapping circles → empty with explanatory state | "If `find_matches()` returns rows in psql, the UI will show them" — ignores RLS, serialization, and empty-state rendering | Entry point for match list fetch; RLS on profiles/dogs for cross-user read; how empty state triggers vs. loading state | Integration (seed users + pins → call matching logic → assert non-empty) | Happy-path-only — must also test boundary (just-below-10% overlap must NOT match) |
| #2 | Matched user A reads user B's profile, dog, and photo path; non-matched user C cannot read B's data | "Owner-only RLS is enough because find_matches is SECURITY DEFINER" — but what about direct table reads from the client outside the function? | Which tables the match-list UI queries directly vs. through the function; current RLS policies on profiles/dogs tables | Integration (authenticated user queries tables for another user → verify allowed/denied by match status) | Testing only the function path while the UI might query tables directly |
| #3 | API responses for match-list and match-detail contain NO fields revealing lat, lng, radius_m, or overlap percentage of another user | "The function only returns safe columns" — but a future column addition or direct table query could leak | Return type of `find_matches()`; any client-side state caching pin data; network payloads | Contract test (assert response shape excludes location fields) | Asserting current output shape without naming WHY each excluded field is dangerous |
| #4 | Expired token triggers transparent refresh via proxy; if refresh fails, user sees a clear "session expired" state — not blank page or silent data loss | "The proxy handles it" — but what if proxy doesn't fire on certain routes, or Supabase returns non-standard error? | Proxy route matching logic; Supabase token lifecycle; error surface when refresh fails | Integration (simulate expired token → verify refresh OR recovery UI) | Mocking the proxy away entirely (defeats purpose) |
| #5 | Sending invitation persists it for recipient; accepting unlocks free-text; declining closes thread; duplicate sends don't create duplicates | "Insert succeeds = invitation sent" — ignores recipient's view, state transitions, and idempotency | Invitation data model; state machine (pending → accepted/declined); messaging unlock condition; unique constraints | Integration (full invitation lifecycle: send → receive → accept → message) | Testing only sender's action without verifying recipient state |
| #6 | Signed URL for user B's dog photo accessible only by user A (a match); same path without valid match-session credentials returns 403 | "Private bucket = safe" — but signed URLs are bearer tokens; if URL leaks or TTL is too long, access is uncontrolled | Storage bucket RLS policy; signed URL TTL; how URL is transmitted to client | Integration (generate signed URL as match → verify; attempt same path as non-match → verify denial) | Testing only that URL generates without testing unauthorized access is denied |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder via `/10x-new`. Status moves left-to-right through the values below; the orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical-path matching | Prove the matching pipeline works end-to-end: seed overlapping users → results returned → privacy preserved | #1, #2, #3 | integration + contract | in progress (4/4 phases impl'd, 2 storage tests skipped) | context/changes/testing-critical-path-matching/ |
| 2 | Auth & session resilience | Prove session lifecycle is sound: login → refresh → expiry → recovery | #4 | integration | not started | — |
| 3 | Messaging & invitation integrity | Prove invitation state machine and messaging unlock work correctly; no duplicate/lost messages | #5 | integration | not started | — |
| 4 | Access-boundary hardening | Prove photo privacy and match-scoped data access hold under adversarial conditions | #6, #2 (reinforcement) | integration + contract | not started | — |
| 5 | Quality-gates wiring | Lock the floor: CI runs lint + typecheck + integration suite on every PR | cross-cutting | CI gates | not started | — |

## 3a. Implementation Status

> Last verified: 2026-06-24

### Implemented

| Test file | Risk | What it proves |
|-----------|------|----------------|
| `src/__tests__/integration/matching.integration.test.ts` | #1 | 6 cases: overlap match, no-overlap empty, no-pin empty, self-exclusion, boundary <10%, multi-match ordering |
| `src/__tests__/integration/privacy-contract.integration.test.ts` | #3 | Response shape allowlist/denylist — no lat/lng/radius leak |
| `src/__tests__/integration/rls-access.integration.test.ts` | #2 | 4 passing (direct table blocks on profiles/dogs/pins + function bypass); 2 storage tests skipped pending RLS fix |
| `e2e/match-list-renders.spec.ts` | #1 | Full browser pipeline: auth → RPC → RLS → UI renders match cards |
| `e2e/seed.spec.ts` | — | Exemplar/reference for Playwright patterns |
| `src/__tests__/helpers/supabase.ts` + `seed.ts` | — | Test infra: admin/auth clients + seed factories |

### Not implemented

| Phase | Risk | What's needed |
|-------|------|---------------|
| 1 (partial) | #2 | 2 storage signed-URL tests — blocked on storage RLS policy fix |
| 2 | #4 | Token refresh via proxy, expiry → recovery UI, 401 handling |
| 3 | #5 | Invitation state machine: send → receive → accept → message, idempotency |
| 4 | #6, #2 | Signed URL TTL, match-scoped photo access, adversarial non-match denial |
| 5 | all | CI pipeline: lint + typecheck + integration on every PR |

### Pending manual checks (Phase 1)

- [ ] 2.3 Test output clearly names scenarios
- [ ] 2.4 `supabase db reset` + re-run produces same results
- [ ] 3.3 Allowlist matches SQL return type in migration
- [ ] 4.3 Storage RLS fix migration applied
- [ ] 4.4 Signed URL test exercises actual storage policy

## 4. Stack

The classic test base for this project.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit + integration | Vitest | 4.1.7 | jsdom env, @testing-library/react, @vitejs/plugin-react; tsconfig paths resolved |
| DOM testing | @testing-library/react | 16.3.2 | For component-level assertions when needed |
| API mocking | none yet — see Phase 1 | — | Likely MSW or direct Supabase test client; research will determine |
| e2e | Playwright | 1.61.0 | testDir: ./e2e, Edge-only (multi-browser planned Phase 6), storageState auth, 2 specs + E2E_RULES.md |
| accessibility | none yet | — | axe-core integration deferred; basic a11y is not an MVP gate |

**Stack grounding tools (current session):**
- Docs: Context7 (`resolve-library-id` + `query-docs`) — available for Next.js 16, Vitest, Supabase API lookups; checked: 2026-06-17
- Search: Exa.ai (`web_search_exa` + `web_fetch_exa` + `web_search_advanced_exa`) — available for tool freshness and status checks; checked: 2026-06-17
- Runtime/browser: none — no Playwright MCP or browser tool in session; checked: 2026-06-17
- Provider/platform: none — no GitHub/Supabase/Vercel MCP in session; checked: 2026-06-17

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|---|---|---|---|
| lint + typecheck | local + CI | required | syntactic / type drift |
| unit + integration | local + CI | required after §3 Phase 1 | logic regressions on matching, RLS, privacy |
| contract tests (response shape) | CI on PR | required after §3 Phase 1 | location privacy leaks, schema drift |
| e2e on critical flows | CI on PR | optional — evaluate after Phase 4 | broken end-to-end user paths |
| post-edit hook | local (agent loop) | recommended after §3 Phase 5 | regressions at edit time |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section fills in once the relevant rollout phase ships.

### 6.1 Adding a unit/integration test

Pattern established in Phase 1. Integration tests:
- Live in `src/__tests__/integration/*.integration.test.ts`
- Run via `npm run test:integration` (Vitest workspace project `integration`, node env)
- Use `getAdminClient()` for seeding, `getAuthenticatedClient(email, pw)` for user simulation
- Seed helpers in `src/__tests__/helpers/seed.ts`: `createTestUser`, `createTestDog`, `createTestPin`, `cleanupTestUser`
- Clean up in `afterAll` via `cleanupTestUser` (cascading delete via auth admin)
- Require local Supabase running (`supabase start`)

### 6.2 Adding a contract test (response shape)

Pattern established in Phase 1 (`privacy-contract.integration.test.ts`):
- Define an `ALLOWED_FIELDS` allowlist and a `FORBIDDEN_FIELDS` denylist
- Seed real data, call the function, assert `Object.keys(result)` matches allowlist exactly
- Also assert forbidden fields are NOT present (belt-and-suspenders)
- Runs as integration test (needs real DB to produce the response to inspect)

### 6.3 Adding a session/auth test

TBD — see §3 Phase 2 for token refresh and session-expiry recovery pattern.

### 6.4 Adding a messaging/state-machine test

TBD — see §3 Phase 3 for invitation lifecycle and idempotency pattern.

### 6.5 Adding a storage/access-boundary test

TBD — see §3 Phase 4 for signed-URL access control and match-scoped photo privacy pattern.

### 6.6 Per-rollout-phase notes

(Filled in as phases ship.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout. Future contributors should respect these unless the underlying assumption changes.

- **shadcn/ui components** — third-party primitives; we test our logic that uses them, not the components themselves. Re-evaluate if we fork or heavily customize a primitive. (Source: Phase 2 interview Q5.)
- **Leaflet map rendering** — trust the library; we test that pin data reaches the map component's props, not that the map draws correctly. Re-evaluate if we switch to a custom renderer. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-17
- Stack versions last verified: 2026-06-17
- AI-native tool references last verified: 2026-06-17 (none in use)

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
