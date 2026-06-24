# E2E Test Rules — Bark Buddy

Rules every E2E test must follow. Read `seed.spec.ts` for the reference pattern.

## Locators (priority order)

1. `getByRole` / `getByLabel` / `getByText` — **always first**
2. `getByTestId` — only when accessibility attributes are ambiguous
3. **Never** CSS selectors, XPath, or DOM structure queries

## Waits

- **Never `page.waitForTimeout()`** — wait for observable state instead:
  - `toBeVisible()`, `toBeHidden()`
  - `waitForURL()`
  - `waitForResponse()`
  - `toHaveCount()`

## Test independence

- Each test is self-contained: own setup, action, assertion, cleanup
- Use unique IDs (e.g. `Date.now()` suffix) so parallel/re-runs don't collide
- No shared mutable state between tests
- Clean up created data after assertions

## Authentication

- Use `storageState: 'auth.json'` — never log in through the UI
- For multi-user scenarios, create separate storage states per user

## Assertions

- Assert **observable user outcomes**, not implementation details
- Bind each assertion to the **risk** it protects (comment why)
- A test that can't fail when its risk materializes is worthless

## File conventions

- One test per file: `e2e/<feature>.spec.ts`
- File name = fs-friendly scenario name
- Provenance header linking to the risk from `test-plan.md`
- Each step has a comment explaining what it verifies

## Real vs mocked boundaries

- **Real**: auth, routing, Supabase DB, RLS — these are where integration risk hides
- **Mock**: expensive external APIs, non-deterministic services (at network layer)
- For server-side API calls, `page.route()` won't intercept — mock where the server calls out

## Anti-patterns to catch in review

1. **Hallucinated assertion** — asserts something the page never shows
2. **Brittle selector** — uses CSS class, nth-child, or DOM structure
3. **Shared state** — test depends on another test's side effects
4. **Wait-for-time** — uses `waitForTimeout` instead of state-based wait
5. **No cleanup** — leaves test data that breaks subsequent runs
