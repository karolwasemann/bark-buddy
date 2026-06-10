<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Supabase Auth Scaffold

- **Plan**: context/changes/supabase-auth-scaffold/plan.md
- **Scope**: All 3 phases (full plan)
- **Date**: 2026-06-01
- **Verdict**: APPROVED (with minor warnings)
- **Findings**: 0 critical, 2 warnings, 3 observations

> Note: Both review sub-agents flagged `src/proxy.ts` as a CRITICAL "dead code / unprotected /dashboard" issue, claiming Next.js requires `middleware.ts`. Verified FALSE against installed Next.js 16.2.6 docs (`16-proxy.md`: "Create a proxy.ts … inside src"; `cdn-caching.md`: "proxy.js (previously Middleware)") and build output (`ƒ Proxy (Middleware)`). The plan was correct; agents reasoned from Next 15 training data. Finding discarded.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Auth actions return raw Supabase error messages

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(auth)/actions.ts:19 (login), :38 (register)
- **Detail**: Both actions return Supabase's raw `error.message` to the client. On register, `signUp` surfaces "User already registered", enabling email enumeration; login can surface states like "Email not confirmed". Plan asked to "show inline error" (satisfied) but did not call for leaking provider-specific messages.
- **Fix**: Return a generic message for login ("Invalid email or password") and a neutral register failure ("Could not create account"). Trade-off: slightly less precise feedback on the register-existing-email manual case.
- **Decision**: SKIPPED

### F2 — Logout ignores signOut() error

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(protected)/actions.ts:8
- **Detail**: `await supabase.auth.signOut()` result is not checked; `redirect("/login")` runs unconditionally. If signOut fails (network), auth cookies persist and the proxy bounces the still-authenticated user from /login back to /dashboard — logout silently fails.
- **Fix**: Capture `{ error }` from `signOut()`; on error surface it (or retry) instead of redirecting blindly.
- **Decision**: FIXED (Fix now)

### F3 — Redundant getUser() per dashboard load

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(protected)/layout.tsx:12-14 + dashboard/page.tsx:7-9
- **Detail**: The protected layout calls `getUser()` for the guard and the dashboard page calls it again to read the email — two auth-server round-trips per load. Plan's Performance section accepts ~50ms getUser per request, so this is acknowledged, but it is 2x.
- **Fix**: Acceptable for MVP. If optimizing later, read the user once and pass it down.
- **Decision**: ACCEPTED-AS-RULE: Redundant getUser() round-trips across layout + page (lesson recorded; code unchanged)

### F4 — Landing page uses raw <a> for internal navigation

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/page.tsx:42 (/login), :48 (/register)
- **Detail**: The /login and /register links use raw `<a>` tags (full page reload) instead of `next/link`. The plan allowed "links (or buttons)" so this is compliant, but it diverges from the Next.js client-navigation convention.
- **Fix**: Swap to `next/link` for the two internal routes.
- **Decision**: FIXED + ACCEPTED-AS-RULE: Raw <a> tags for internal route navigation

### F5 — Unsafe FormData casts in auth actions

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(auth)/actions.ts:13-14, :28-30
- **Detail**: `formData.get("password") as string` etc. If a field is absent (action invoked outside the form), the value is null; register's `password.length` check would throw a runtime error rather than returning a clean message. HTML `required` guards only the normal path.
- **Fix**: Coerce with `?.toString() ?? ""` or validate presence before use.
- **Decision**: FIXED + ACCEPTED-AS-RULE: Unsafe `as string` casts on FormData reads

## Success Criteria

- `npm run build` — PASS (Next 16.2.6, compiled successfully, 9 routes; `ƒ Proxy (Middleware)` recognized, /dashboard dynamic)
- `npm run lint` — PASS (exit 0; 2 warnings, both in unrelated src/__tests__/page.test.tsx, outside this change)
- shadcn components exist — PASS (button/input/card/label)
- Manual items 1.4–3.8 — all [x] with commit shas; supporting code present in diff (no rubber-stamping observed)
