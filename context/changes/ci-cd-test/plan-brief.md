# CI/CD Pipeline — Plan Brief

> Full plan: `context/changes/ci-cd-test/plan.md`
> Research: `context/changes/ci-cd-test/research.md`

## What & Why

Replace the existing single-job CI workflow with three parallel jobs (lint+typecheck+build, unit+integration tests, e2e tests) to catch regressions faster and gate PRs on all quality dimensions before merge.

## Starting Point

A basic `.github/workflows/ci.yml` exists with one job running lint → test → build. No type-check step, no e2e tests, no Playwright in CI. All tooling (ESLint, TypeScript, Vitest, Playwright) is already installed and configured.

## Desired End State

Every PR and push to main runs three parallel CI jobs. The quality job catches lint/type/build errors in ~2 min. The test job catches logic regressions via unit+integration tests in ~1 min. The e2e job catches full-stack breakage via Playwright on Chromium in ~4 min. All three must pass to merge.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-------------------|--------|
| Job structure | 3 parallel jobs | Fastest feedback — each dimension runs independently | Plan |
| E2E browser in CI | Chromium (conditional) | Standard on ubuntu runners, negligible diff from Edge | Plan |
| E2E authentication | Playwright setup project | Self-contained, no stale tokens, mimics real user flow | Plan |
| Integration tests | Include in test job | Catches RLS/DB regressions before merge | Plan |
| Build step | Keep in quality job | Catches build-only failures lint+tsc miss | Plan |
| Trigger | Push to main + PR to main | Same as existing — quality gate + post-merge validation | Research |

## Scope

**In scope:**
- Rewrite `ci.yml` with 3 parallel jobs
- Add `typecheck` script to package.json
- Add Playwright auth setup project (`e2e/auth.setup.ts`)
- Conditional Chromium/Edge in `playwright.config.ts`
- Document required GitHub secrets

**Out of scope:**
- Deployment automation (Vercel handles it)
- Test coverage reporting
- Browser caching optimization
- Multi-Node-version matrix

## Architecture / Approach

```
PR / push to main
  ├── quality job: lint → typecheck → build
  ├── test job: npm test (unit + integration, with Supabase secrets)
  └── e2e job: install Chromium → setup login → Playwright tests
```

All jobs share the same trigger and run independently on ubuntu-latest with Node 20.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Workflow & Scripts | 3-job ci.yml + typecheck script | YAML syntax errors; missing secret refs |
| 2. Playwright CI Setup | auth.setup.ts + conditional browser config | Login flow changes breaking setup; selector drift |
| 3. Secrets & Verification | Documented secrets, proven green pipeline | Missing/wrong secret values in GitHub |

**Prerequisites:** GitHub repo admin access (to add secrets), Supabase test account credentials, a branch to push for testing.
**Estimated effort:** ~1-2 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes a test account exists in Supabase that can log in with email/password
- Login form uses accessible labels (`getByLabel(/email/i)`, `getByLabel(/password/i)`) — if not, setup project selectors need adjustment
- Integration tests may be flaky if Supabase test instance has rate limits

## Success Criteria (Summary)

- PR shows three green checks (quality, test, e2e) running in parallel
- E2E tests authenticate automatically without pre-committed secrets
- Pipeline triggers on both push to main and PR to main
