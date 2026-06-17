# Critical-Path Matching Tests — Plan Brief

> Full plan: `context/changes/testing-critical-path-matching/plan.md`
> Research: `context/changes/testing-critical-path-matching/research.md`

## What & Why

Set up integration test infrastructure and write tests covering the three highest-priority risks: silent matching failure, RLS blocking cross-user data, and location privacy leaks. These are the riskiest paths in the app — one has an active bug (storage RLS) — and zero test coverage exists today.

## Starting Point

Vitest is installed with a single smoke test. No Supabase test client, no seed helpers, no workspace separation between unit and integration tests. Local Supabase is configured and ready.

## Desired End State

A working integration test suite that runs against local Supabase, proving: the matching pipeline returns correct results for overlapping users, RLS correctly blocks direct cross-user queries while allowing function-mediated access, and the API response shape never leaks location data.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-------------------|--------|
| Test execution environment | Local Supabase | Real PostGIS/RLS/Storage is the only way to exercise the actual risks | Plan |
| Storage RLS bug handling | Fix in separate change first | Clean separation; keeps this plan focused on testing | Plan |
| Test data seeding | Per-test via service_role client | Self-contained tests with no shared mutable state | Plan |
| Vitest project separation | Workspace with unit + integration | Lets `test:unit` stay fast without requiring Supabase | Plan |

## Scope

**In scope:**
- Vitest workspace config (unit vs integration)
- Supabase test helpers (admin client, auth client, data factory)
- Integration tests for `find_matches()` (6 scenarios)
- Contract test for response shape privacy (3 assertions)
- RLS access boundary tests (6 scenarios)
- npm scripts for running test subsets

**Out of scope:**
- Fixing the storage RLS bug (separate change)
- UI/component tests
- CI pipeline setup (Phase 5)
- e2e/Playwright tests

## Architecture / Approach

```
vitest.workspace.ts
├── unit project (jsdom, fast, no external deps)
│   └── src/__tests__/*.test.ts
└── integration project (node env, needs `supabase start`)
    ├── src/__tests__/helpers/supabase.ts  (client factory)
    ├── src/__tests__/helpers/seed.ts      (data factory)
    └── src/__tests__/integration/*.integration.test.ts
```

Tests seed data via service_role (bypasses RLS), authenticate as specific users, then assert on RPC/query results.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Test Infrastructure | Vitest workspace, helpers, npm scripts | Config mistakes break existing test |
| 2. Risk #1 — Matching | 6 tests proving find_matches pipeline | PostGIS geometry seeding complexity |
| 3. Risk #3 — Privacy | 3 contract assertions on response shape | False sense of security if allowlist is wrong |
| 4. Risk #2 — RLS Access | 6 tests on cross-user read boundaries | Depends on storage fix being deployed first |

**Prerequisites:** `supabase start` must work; storage RLS fix deployed before Phase 4
**Estimated effort:** ~2 sessions across 4 phases

## Open Risks & Assumptions

- Storage RLS fix must land before Phase 4 tests can pass — if delayed, Phase 4 can be deferred
- Local Supabase PostGIS geometry calculations may have minor precision differences from hosted — unlikely to matter at our overlap thresholds
- `service_role` key for local Supabase is deterministic (printed by `supabase status`) — test env file won't need rotation

## Success Criteria (Summary)

- `npm run test:integration` passes all ~15 tests against local Supabase
- A deliberately broken `find_matches()` threshold causes the relevant test to fail (signal is real)
- Tests are self-contained: `supabase db reset` + re-run produces the same result
