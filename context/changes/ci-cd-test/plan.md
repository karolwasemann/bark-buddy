# CI/CD Pipeline Implementation Plan

## Overview

Replace the existing single-job CI workflow with three parallel jobs: lint+typecheck+build, unit+integration tests, and e2e tests. Add a Playwright setup project for CI authentication and conditional Chromium browser usage.

## Current State Analysis

- `.github/workflows/ci.yml` runs a single job: lint → test → build
- No dedicated type-check step (relies on `next build` implicitly)
- No e2e tests in CI (Playwright installed but not wired up)
- `npm test` conflates unit and integration tests
- Playwright config uses `msedge` channel (not available on CI runners)
- E2E tests depend on `auth.json` which doesn't exist in CI

### Key Discoveries:

- `package.json` already has `test:unit`, `test:integration`, `test:e2e` scripts
- Integration tests need: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Login action redirects to `/dashboard` on success (`src/app/(auth)/actions.ts:21`)
- `auth.json` already in `.gitignore`
- Vitest loads integration env from `.env.test.local` via custom `loadEnvFile()` in `vitest.config.mts`

## Desired End State

Three parallel GitHub Actions jobs run on push/PR to main:
1. **quality** — lint, typecheck, build (~2 min)
2. **test** — unit + integration tests with Supabase secrets (~1 min)
3. **e2e** — Playwright tests on Chromium with auto-login setup (~4 min)

All three must pass for PR to be mergeable. Verification: push a branch, open a PR, observe all three jobs green.

## What We're NOT Doing

- Deployment automation (Vercel handles that post-merge)
- Test coverage reporting
- Caching Playwright browsers (optimization for later)
- Matrix strategy for multiple Node versions
- Conditional job skipping (all jobs always run)

## Implementation Approach

Phase 1 handles the workflow YAML and package.json script. Phase 2 modifies Playwright config and adds the auth setup file. Phase 3 documents secrets and provides verification steps. All three phases are needed for the pipeline to work end-to-end.

## Phase 1: Workflow & Scripts

### Overview

Rewrite the CI workflow into three parallel jobs and add a `typecheck` npm script.

### Changes Required:

#### 1. Add typecheck script

**File**: `package.json`

**Intent**: Add a dedicated `typecheck` script so CI can run type-checking as a named step with clear output.

**Contract**: Add `"typecheck": "tsc --noEmit"` to the `scripts` object.

#### 2. Rewrite CI workflow

**File**: `.github/workflows/ci.yml`

**Intent**: Replace the single `ci` job with three parallel jobs: `quality`, `test`, `e2e`. All trigger on push to main and PR to main. Each job independently checks out, installs deps, and runs its steps.

**Contract**: Three jobs, each with `runs-on: ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4` (node 20, npm cache), `npm ci`. Specifics:

- **quality** job steps: `npm run lint` → `npm run typecheck` → `npm run build`
- **test** job steps: `npm test` (runs both unit + integration). Env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` injected from `secrets.*`.
- **e2e** job steps: `npx playwright install chromium --with-deps` → `npm run test:e2e`. Env vars `SUPABASE_TEST_EMAIL`, `SUPABASE_TEST_PASSWORD` injected from `secrets.*`.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` passes locally
- `npm run lint` passes locally
- `npm run build` passes locally
- Workflow YAML is valid: `actionlint .github/workflows/ci.yml` (or manual review)

#### Manual Verification:

- Push to a branch and confirm three jobs appear in GitHub Actions

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Playwright CI Setup

### Overview

Modify Playwright config for CI compatibility: add an auth setup project that logs in via the UI, and use Chromium (not Edge) in CI.

### Changes Required:

#### 1. Create auth setup file

**File**: `e2e/auth.setup.ts`

**Intent**: A Playwright setup test that navigates to `/login`, fills credentials from env vars, submits the form, waits for redirect to `/dashboard`, and saves `storageState` to `auth.json`.

**Contract**: Uses `@playwright/test` setup pattern. Reads `process.env.SUPABASE_TEST_EMAIL` and `process.env.SUPABASE_TEST_PASSWORD`. Uses role-based locators (`getByLabel`, `getByRole`) per project conventions. Saves to `auth.json`.

#### 2. Update Playwright config

**File**: `playwright.config.ts`

**Intent**: Add a `setup` project that runs `auth.setup.ts` before tests. Replace the single `edge` project with a CI-conditional: Chromium (no channel) in CI, Edge locally. Both depend on `setup`.

**Contract**: 
- `setup` project: `testMatch: /.*\.setup\.ts/`, `use: { storageState: undefined }`
- CI project: `name: "chromium"`, `use: { ...devices["Desktop Chrome"] }`, `dependencies: ["setup"]`
- Local project: `name: "edge"`, `use: { ...devices["Desktop Edge"], channel: "msedge" }`, `dependencies: ["setup"]`
- Selection via `process.env.CI` ternary in the `projects` array

### Success Criteria:

#### Automated Verification:

- `npx playwright test --project=setup` completes locally (requires test credentials in env)
- `CI=true npx playwright test` runs on Chromium locally
- `npx playwright test` runs on Edge locally

#### Manual Verification:

- E2E tests pass in CI after pushing (job 3 green)
- `auth.json` is NOT committed (already in `.gitignore`)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: GitHub Secrets & Verification

### Overview

Document required GitHub repository secrets and verify the full pipeline works end-to-end.

### Changes Required:

#### 1. Document secrets

**File**: `context/changes/ci-cd-test/change.md` (Notes section)

**Intent**: Record the required GitHub secrets so the team knows what to configure.

**Contract**: Document these secrets:
- `SUPABASE_URL` — Supabase project URL (for integration tests)
- `SUPABASE_ANON_KEY` — Supabase anon/public key (for integration tests)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for integration tests)
- `SUPABASE_TEST_EMAIL` — Test account email (for e2e auth setup)
- `SUPABASE_TEST_PASSWORD` — Test account password (for e2e auth setup)

#### 2. Enable branch protection

**File**: GitHub repo settings (not a code change)

**Intent**: Block merging to main when any CI job fails. Ensures the pipeline is a real gate, not advisory.

**Contract**: GitHub → Settings → Branches → Add rule for `main`:
- Enable "Require status checks to pass before merging"
- Mark as required: `quality`, `test`, `e2e`
- Optionally enable "Require branches to be up to date before merging"

### Success Criteria:

#### Automated Verification:

- All three CI jobs pass on a test PR

#### Manual Verification:

- GitHub repository has all 5 secrets configured
- PR shows three green checks: quality, test, e2e
- Merging is blocked when any job fails
- Merging the PR triggers the same pipeline on push to main

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Not applicable — this change is infrastructure, not application code

### Integration Tests:

- The pipeline itself IS the integration test — all three jobs passing proves the system works

### Manual Testing Steps:

1. Push branch with workflow changes
2. Open PR to main
3. Verify three jobs appear and run in parallel
4. Verify `quality` job runs lint → typecheck → build
5. Verify `test` job runs unit + integration tests
6. Verify `e2e` job installs Chromium, logs in via setup project, runs Playwright tests
7. Merge PR, verify same pipeline runs on push to main

## References

- Related research: `context/changes/ci-cd-test/research.md`
- Existing workflow: `.github/workflows/ci.yml`
- Deployment context: `context/changes/deployment/deployment-plan.md`
- Playwright config: `playwright.config.ts`
- Vitest config: `vitest.config.mts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Workflow & Scripts

#### Automated

- [x] 1.1 `npm run typecheck` passes locally — 888b79a
- [x] 1.2 `npm run lint` passes locally — 888b79a
- [x] 1.3 `npm run build` passes locally — 888b79a
- [x] 1.4 Workflow YAML valid — 888b79a

#### Manual

- [x] 1.5 Three jobs appear in GitHub Actions on push — 888b79a

### Phase 2: Playwright CI Setup

#### Automated

- [x] 2.1 `npx playwright test --project=setup` completes locally — 1b229cf
- [x] 2.2 `CI=true npx playwright test` runs on Chromium — 1b229cf
- [x] 2.3 `npx playwright test` runs on Edge locally — 1b229cf

#### Manual

- [x] 2.4 E2E tests pass in CI (job 3 green) — 1b229cf

### Phase 3: GitHub Secrets & Verification

#### Automated

- [ ] 3.1 All three CI jobs pass on a test PR

#### Manual

- [ ] 3.2 GitHub repository has all 5 secrets configured
- [ ] 3.3 PR shows three green checks
- [ ] 3.4 Merging blocked when a job fails
- [ ] 3.5 Push to main triggers pipeline
