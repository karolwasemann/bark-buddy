---
date: 2026-06-24T10:37:21+02:00
researcher: Kiro
git_commit: 802d9456ac31d07077f089980bfcf262ac550adb
branch: main
repository: 10xdevs
topic: "CI/CD pipeline with lint, type-check, unit test, and e2e steps"
tags: [research, ci-cd, github-actions, vitest, playwright, eslint, typescript]
status: complete
last_updated: 2026-06-24
last_updated_by: Kiro
---

# Research: CI/CD pipeline with lint, type-check, unit test, and e2e steps

**Date**: 2026-06-24T10:37:21+02:00
**Researcher**: Kiro
**Git Commit**: 802d9456ac31d07077f089980bfcf262ac550adb
**Branch**: main
**Repository**: 10xdevs

## Research Question

Implement CI/CD with four steps: linter, type check, unit test, and e2e test.

## Summary

An existing `.github/workflows/ci.yml` already runs lint → test → build on push/PR to main. It lacks a dedicated type-check step and has no e2e stage. The tooling for all four requested steps is already installed and configured — only the workflow YAML needs updating.

Key gaps in the existing workflow:
1. No `tsc --noEmit` type-check step (currently relies on `next build` catching type errors implicitly)
2. No Playwright e2e step (Playwright is installed, tests exist, but CI doesn't run them)
3. Unit tests and integration tests run together — may want to split for CI clarity

## Detailed Findings

### 1. Existing CI Workflow (`.github/workflows/ci.yml`)

Current pipeline:
```yaml
on: push/PR to main
jobs.ci: ubuntu-latest, node 20, npm cache
steps: checkout → setup-node → npm ci → lint → test → build
```

- Uses `actions/checkout@v4` and `actions/setup-node@v4`
- `npm test` runs `vitest run` which executes both unit and integration projects
- No type-check step separate from build
- No Playwright installation or execution

### 2. Linting — Ready

- **Command**: `npm run lint` (runs `eslint` via flat config)
- **Config**: `eslint.config.mjs` — extends `next/core-web-vitals` + `next/typescript`
- **Ignores**: `.next/`, `out/`, `build/`, `next-env.d.ts`
- Already in CI workflow — no changes needed for this step

### 3. Type Check — Needs Script

- **Command**: `npx tsc --noEmit` (or add `"typecheck": "tsc --noEmit"` to package.json)
- **Config**: `tsconfig.json` with `strict: true`, `noEmit: true`, target ES2017
- **Includes**: all `*.ts`, `*.tsx`, `*.mts` files
- Not currently a separate CI step — `next build` runs tsc internally but fails late and conflates build errors with type errors

### 4. Unit Tests — Ready

- **Command**: `npm run test:unit` (runs `vitest run --project unit`)
- **Config**: `vitest.config.mts` defines two projects:
  - `unit`: jsdom environment, `src/**/*.test.{ts,tsx}`, excludes `*.integration.test.ts`
  - `integration`: node environment, `src/**/*.integration.test.ts`, loads `.env.test.local`
- **Existing tests**: `src/__tests__/page.test.tsx` (unit), 3 integration tests
- For CI, `test:unit` isolates just unit tests (no env vars needed)
- Integration tests require Supabase credentials (`.env.test.local`) — separate concern

### 5. E2E Tests — Needs Workflow Step

- **Command**: `npm run test:e2e` (runs `playwright test`)
- **Config**: `playwright.config.ts`
  - Test dir: `./e2e/`
  - Browser: Desktop Edge (`msedge` channel)
  - `forbidOnly: !!process.env.CI` — fails if `.only` left in CI
  - `retries: 2` in CI, `workers: 1` in CI
  - `webServer`: starts `npm run dev` at localhost:3000 (does NOT reuse existing in CI)
  - `storageState: "auth.json"` — requires pre-authenticated session file
- **Existing tests**: `e2e/seed.spec.ts`, `e2e/match-list-renders.spec.ts`
- **CI requirements**:
  - Install Playwright browsers: `npx playwright install --with-deps`
  - Provide `auth.json` (or generate it in CI — needs Supabase test credentials)
  - `npm run dev` will be started by Playwright's `webServer` config
  - Edge browser must be available (or switch to Chromium for CI)

### 6. Playwright CI Challenges

The current Playwright config uses `msedge` channel which requires Edge to be installed on the runner. Options:
- **Option A**: Install Edge on ubuntu runner (add step for Edge install)
- **Option B**: Change Playwright config to use `chromium` in CI (no channel, default Chromium)
- **Option C**: Use a conditional project — `chromium` in CI, `msedge` locally

The `storageState: "auth.json"` dependency means E2E tests need either:
- A pre-generated auth.json committed (security concern) or stored as GitHub secret
- A setup project in Playwright that logs in and saves state
- Supabase credentials available as env vars in CI

## Code References

- `.github/workflows/ci.yml` — existing CI pipeline
- `package.json:8-15` — script definitions (lint, test, test:unit, test:e2e)
- `eslint.config.mjs` — flat config, next/core-web-vitals + next/typescript
- `tsconfig.json` — strict: true, noEmit: true
- `vitest.config.mts` — two projects (unit + integration)
- `playwright.config.ts` — Edge, storageState, webServer
- `e2e/seed.spec.ts` — exemplar E2E test pattern
- `e2e/match-list-renders.spec.ts` — real E2E test

## Architecture Insights

The existing deployment workflow (documented in `context/changes/deployment/deployment-plan.md`) describes the intended flow:
```
Push → GitHub Actions CI → Tests pass? → Merge → Vercel auto-deploy
```

The CI workflow is positioned as a quality gate before merging to main. Vercel handles the actual deployment after merge. This means CI should be fast and blocking — e2e should likely run as a separate job (possibly in parallel with lint+typecheck+unit) to avoid slowing the gate.

**Recommended workflow structure:**
```
Job 1 (quality): lint → typecheck → unit test  (fast, ~2 min)
Job 2 (e2e): install browsers → e2e test       (slow, ~5 min, parallel)
```

Or sequential if simplicity is preferred:
```
Single job: lint → typecheck → unit test → e2e test
```

## Historical Context (from prior changes)

- `context/changes/deployment/deployment-plan.md` — documents CI as quality gate, Vercel as deploy target. Already references the existing lint→test→build pipeline.
- No prior CI-specific changes found in archive.

## Open Questions

1. **E2E auth**: How should `auth.json` be provided in CI? Options: GitHub secret, setup project, or skip auth-dependent tests in CI.
2. **E2E browser**: Keep Edge (needs install step) or switch to Chromium for CI portability?
3. **Integration tests in CI**: Should they run? They need `.env.test.local` with Supabase creds.
4. **Job structure**: Single sequential job or parallel jobs (fast gate + slow e2e)?
5. **Build step**: Keep `npm run build` after tests, or drop it since Vercel runs its own build?
