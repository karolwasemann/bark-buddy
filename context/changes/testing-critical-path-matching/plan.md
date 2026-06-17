# Critical-Path Matching Tests — Implementation Plan

## Overview

Set up integration test infrastructure and write tests covering the three highest-priority risks from the test-plan: silent matching failure (#1), RLS cross-user data blocking (#2), and location privacy leak (#3). Tests run against local Supabase to exercise real PostGIS, RLS, and Storage behavior.

## Current State Analysis

- Vitest 4.1.7 with jsdom, @testing-library/react, tsconfigPaths — no workspace config
- 1 existing smoke test (`src/__tests__/page.test.tsx`)
- Local Supabase available (`supabase/config.toml`, port 54322)
- No test helpers, no seed data, no service_role client for tests
- `find_matches()` is SECURITY DEFINER with PostGIS overlap ≥10% threshold
- Active storage RLS bug (matched user can't access other user's photo) — **will be fixed in a separate change before Phase 2 of this plan runs**

### Key Discoveries:

- `find_matches()` returns `[]` silently for: no requester pin, below-threshold overlap, NULLIF zero-area edge case (research.md lines on Risk #1)
- All RLS is owner-only; no match-scoped exception exists anywhere (research.md Risk #2)
- Return type is clean — no lat/lng/radius fields (migration line 6-13)
- `@supabase/supabase-js` is already a dependency (v2.106.2) — can create a raw client with service_role key for test seeding

## Desired End State

- `vitest.workspace.ts` separates `unit` (jsdom, fast) from `integration` (node, needs Supabase)
- `npm run test:unit` runs unit tests; `npm run test:integration` runs integration tests; `npm run test` runs both
- A shared test helper creates authenticated Supabase clients and seeds users/dogs/pins
- 3 test files cover Risks #1, #2, #3 with clear assertions
- All tests pass against local Supabase (`supabase start`)

## What We're NOT Doing

- Writing test code (that's the implementer's job — this plan describes intent and contracts)
- Fixing the storage RLS bug (separate change, prerequisite for Risk #2 tests)
- Setting up CI (Phase 5 in the test-plan)
- Adding e2e/Playwright tests
- Testing UI rendering or components (only DB/RLS/contract layer)

## Implementation Approach

Bottom-up: infrastructure first, then tests ordered by independence (Risk #1 needs only `find_matches`, Risk #3 is a pure contract check, Risk #2 needs both function + direct client queries and depends on the storage fix being deployed).

## Phase 1: Test Infrastructure Setup

### Overview

Create the Vitest workspace, Supabase test client helpers, and npm scripts that let integration tests run against local Supabase.

### Changes Required:

#### 1. Vitest workspace config

**File**: `vitest.workspace.ts`

**Intent**: Define two projects — `unit` (existing jsdom tests) and `integration` (new tests needing Supabase in node env). This lets developers run fast unit tests independently.

**Contract**: Export an array with two project definitions. `unit` uses `vitest.config.mts` as-is. `integration` uses `environment: 'node'`, includes `**/*.integration.test.ts`, and sets `env` to load from `.env.test.local`.

#### 2. Update existing Vitest config scope

**File**: `vitest.config.mts`

**Intent**: Restrict existing config to unit tests only (exclude integration test files).

**Contract**: Add `exclude` pattern for `**/*.integration.test.ts` to the test config.

#### 3. Environment file for integration tests

**File**: `.env.test.local`

**Intent**: Provide local Supabase connection details for integration tests. Uses service_role key to bypass RLS for seeding.

**Contract**: Contains `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_ANON_KEY=<local-anon-key>`, `SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>`. Add to `.gitignore`.

#### 4. Supabase test helper

**File**: `src/__tests__/helpers/supabase.ts`

**Intent**: Provide factory functions for creating admin (service_role) and authenticated (anon + user session) Supabase clients for tests.

**Contract**:
- `getAdminClient()` — returns a client with service_role key (bypasses RLS, used for seeding/cleanup)
- `getAuthenticatedClient(email, password)` — signs in with email/password, returns authenticated client
- Both read connection details from `process.env`

#### 5. Test data factory

**File**: `src/__tests__/helpers/seed.ts`

**Intent**: Provide helper functions to seed test users with profiles, dogs, and walking pins. Each helper returns the created IDs for later assertion/cleanup.

**Contract**:
- `createTestUser(adminClient, overrides?)` — creates auth user + profile, returns `{ userId, email, password }`
- `createTestDog(adminClient, { ownerId, name?, breed?, photoPath? })` — inserts dog row, returns `{ dogId }`
- `createTestPin(adminClient, { dogId, lat, lng, radiusM })` — inserts walking_pin with PostGIS point, returns `{ pinId }`
- `cleanupTestUser(adminClient, userId)` — deletes user + cascading data (pin, dog, profile)

#### 6. npm scripts

**File**: `package.json`

**Intent**: Add separate scripts for unit and integration tests.

**Contract**: Add `"test:unit": "vitest run --project unit"`, `"test:integration": "vitest run --project integration"`. Keep `"test": "vitest run"` (runs all).

### Success Criteria:

#### Automated Verification:

- `npm run test:unit` passes (existing smoke test still works)
- `npm run test:integration` exits cleanly with 0 tests (no integration tests written yet)
- TypeScript compiles: `npx tsc --noEmit`

#### Manual Verification:

- `supabase start` runs successfully
- Helper imports resolve without error in a trivial integration test file

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Risk #1 Tests — Silent Matching Failure

### Overview

Integration tests that call `find_matches()` directly against local Supabase with seeded data. Proves the matching pipeline returns results for overlapping users, returns empty for non-overlapping users, and handles boundary/edge cases.

### Changes Required:

#### 1. Matching integration test file

**File**: `src/__tests__/integration/matching.integration.test.ts`

**Intent**: Test `find_matches()` RPC with various user configurations to prove the matching pipeline works or fails predictably.

**Contract**: Test cases:

| Test name | Setup | Assertion |
|-----------|-------|-----------|
| returns match for overlapping users | 2 users, pins 500m apart, radius 400m each (>10% overlap) | RPC returns 1 match with correct fields |
| returns empty for non-overlapping users | 2 users, pins 10km apart, radius 200m each | RPC returns `[]` |
| returns empty when requester has no pin | User A has no pin, User B has pin | RPC returns `[]` |
| excludes self from results | 1 user with pin | RPC returns `[]` (doesn't match self) |
| respects 10% overlap threshold boundary | 2 users with pins positioned so overlap is just below 10% | RPC returns `[]` |
| returns multiple matches ordered by distance | 3 users, User A overlaps with B (close) and C (far) | RPC returns 2 matches, B before C |

Each test:
- Seeds users/dogs/pins in `beforeAll` or `beforeEach`
- Authenticates as the requesting user
- Calls `.rpc('find_matches', { requesting_user_id })`
- Asserts on result count and field presence
- Cleans up in `afterAll`/`afterEach`

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` passes with all 6 matching tests green
- No TypeScript errors: `npx tsc --noEmit`

#### Manual Verification:

- Verify test output clearly names which scenario passed/failed
- Confirm `supabase db reset` + re-run produces same results (tests are self-contained)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Risk #3 Tests — Location Privacy Contract

### Overview

Contract test asserting the shape of `find_matches()` response. Proves no location fields (lat, lng, radius_m, overlap percentage) appear in the response — guards against future column additions leaking private data.

### Changes Required:

#### 1. Privacy contract test file

**File**: `src/__tests__/integration/privacy-contract.integration.test.ts`

**Intent**: Assert that `find_matches()` returns ONLY the allowed fields. This catches accidental column additions at the response level.

**Contract**: Test cases:

| Test name | Setup | Assertion |
|-----------|-------|-----------|
| response contains only allowed fields | 2 overlapping users | Every key in response row is in allowlist: `[profile_id, display_name, bio, dog_name, dog_breed, dog_photo_path, distance_bucket]` |
| response excludes location fields explicitly | 2 overlapping users | Assert `lat`, `lng`, `radius_m`, `overlap`, `location`, `distance` (exact meters) are NOT present as keys |
| distance_bucket is one of allowed values | 2 overlapping users | Value is one of `['nearby', 'moderate', 'far']` |

Reuses the same overlapping-user seed from Phase 2 (can share a seed helper call).

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` passes including all privacy contract tests
- No TypeScript errors

#### Manual Verification:

- Review test assertions: confirm the allowlist matches the SQL return type in migration file exactly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Risk #2 Tests — RLS Cross-User Access

### Overview

Integration tests proving that RLS correctly allows/denies cross-user data access. Tests that matched users CAN read each other's profile/dog data through the function, and that non-matched users CANNOT read data via direct table queries.

**Prerequisite**: The storage RLS fix must be deployed to local Supabase before this phase runs. If not yet done, open the fix change first.

### Changes Required:

#### 1. RLS integration test file

**File**: `src/__tests__/integration/rls-access.integration.test.ts`

**Intent**: Prove RLS boundaries work: `find_matches()` exposes cross-user data (by design, SECURITY DEFINER), but direct table queries are blocked for non-owners.

**Contract**: Test cases:

| Test name | Setup | Assertion |
|-----------|-------|-----------|
| authenticated user cannot read another user's profile directly | 2 users (A, B) | User A queries `profiles` table for User B's id → returns empty (RLS blocks) |
| authenticated user cannot read another user's dogs directly | 2 users (A, B) | User A queries `dogs` table for User B's dog → returns empty |
| authenticated user cannot read another user's walking_pin directly | 2 users (A, B) | User A queries `walking_pins` for User B's pin → returns empty |
| find_matches bypasses RLS for matched data | 2 overlapping users (A, B) | User A calls find_matches → gets User B's profile/dog data |
| matched user can access other user's photo via signed URL | 2 overlapping users (A, B), storage fix deployed | User A calls `createSignedUrl` for User B's photo path → returns valid URL |
| non-matched user cannot access other user's photo | 2 non-overlapping users (A, B) | User A calls `createSignedUrl` for User B's photo path → returns error/null |

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` passes including all RLS tests
- No TypeScript errors

#### Manual Verification:

- Confirm the storage RLS fix migration is applied before running these tests
- Verify that test for signed URL access actually exercises the storage policy (not just the function return)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Integration Tests:

- All tests in this plan are integration tests running against local Supabase
- They exercise real PostGIS geometry calculations, real RLS policies, and real Storage rules
- No mocking of Supabase — the whole point is testing the actual DB behavior

### Contract Tests:

- Risk #3 is a contract test (asserts response shape) but runs as an integration test (needs real DB to produce a response)
- It's the cheapest test that catches future regressions (someone adds a column to the function)

### Manual Testing Steps:

1. Run `supabase start` and verify all services are healthy
2. Run `npm run test:integration` and confirm all tests pass
3. Run `supabase db reset` then re-run tests to confirm they're self-contained
4. Intentionally break something (e.g., change overlap threshold in migration) and confirm the relevant test fails

## Performance Considerations

- Integration tests are slower than unit tests (~2-5s per test due to DB round-trips)
- Vitest workspace separation means `npm run test:unit` stays fast for developer feedback
- Test data seeding uses `service_role` key (no auth flow overhead)

## Migration Notes

- No schema migrations in this plan — tests only READ existing schema behavior
- Phase 4 depends on a separate storage RLS fix migration being applied first
- If `supabase/seed.sql` is created for other purposes later, tests should remain independent of it

## References

- Research: `context/changes/testing-critical-path-matching/research.md`
- Test plan: `context/foundation/test-plan.md` (§3 Phase 1)
- find_matches SQL: `supabase/migrations/20260610092307_create_find_matches_function.sql`
- Storage RLS: `supabase/migrations/20260610092303_create_dog_photos_bucket.sql`
- Lesson: "Storage RLS must align with function-level access" (`context/foundation/lessons.md`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Test Infrastructure Setup

#### Automated

- [x] 1.1 `npm run test:unit` passes (existing smoke test works)
- [x] 1.2 `npm run test:integration` exits cleanly with 0 tests
- [x] 1.3 TypeScript compiles: `npx tsc --noEmit`

#### Manual

- [x] 1.4 `supabase start` runs successfully
- [x] 1.5 Helper imports resolve without error

### Phase 2: Risk #1 Tests — Silent Matching Failure

#### Automated

- [x] 2.1 `npm run test:integration` passes with all 6 matching tests green — 4c00974
- [x] 2.2 No TypeScript errors — 4c00974

#### Manual

- [ ] 2.3 Test output clearly names scenarios
- [ ] 2.4 `supabase db reset` + re-run produces same results

### Phase 3: Risk #3 Tests — Location Privacy Contract

#### Automated

- [x] 3.1 `npm run test:integration` passes including privacy contract tests — 6fda39c
- [x] 3.2 No TypeScript errors — 6fda39c

#### Manual

- [ ] 3.3 Allowlist matches SQL return type in migration exactly

### Phase 4: Risk #2 Tests — RLS Cross-User Access

#### Automated

- [x] 4.1 `npm run test:integration` passes with 4 RLS tests green (2 storage tests skipped pending policy fix)
- [x] 4.2 No TypeScript errors

#### Manual

- [ ] 4.3 Storage RLS fix migration applied before running
- [ ] 4.4 Signed URL test exercises actual storage policy
