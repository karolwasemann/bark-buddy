# Supabase Auth Scaffold Implementation Plan

## Overview

Implement email+password authentication for BarkBuddy using Supabase Auth: register, login, logout, and route protection via Next.js 16 proxy. This is foundation F-01 — every subsequent slice (profiles, map, matching, messaging) depends on an authenticated user.

## Current State Analysis

- `src/lib/supabase/client.ts` — browser client via `@supabase/ssr` `createBrowserClient` ✅
- `src/lib/supabase/server.ts` — server client via `@supabase/ssr` `createServerClient` with cookie handling ✅
- No `proxy.ts` (Next.js 16 middleware equivalent) — sessions won't refresh, no route protection
- No auth pages, components, or Server Actions
- No `.env.example` documenting required env vars
- No component library installed (shadcn/ui planned)
- Single route exists: `/` (default landing page)

### Key Discoveries:

- Next.js 16 renamed `middleware.ts` → `proxy.ts` with `export function proxy()` (breaking change from 15)
- `@supabase/ssr` ^0.10.3 `setAll` accepts a `headers` parameter for cache-control
- `getUser()` must be used instead of `getSession()` for secure server-side checks (getSession reads unverified cookie data)
- shadcn/ui auto-detects Tailwind 4 and uses CSS-only config — no `tailwind.config.ts` needed

## Desired End State

A user can visit BarkBuddy, register with email+password, log in, see a protected dashboard confirming their session, and log out. Unauthenticated visitors hitting any protected route are redirected to `/login`. Authenticated users hitting `/login` or `/register` are redirected to `/dashboard`. Sessions are refreshed transparently on every navigation via proxy.

### Verification:

- `npm run build` passes with zero errors
- Manual: register → redirected to login with success message → login → see dashboard with email → logout → redirected to login → visit `/dashboard` directly → redirected to login

## What We're NOT Doing

- OAuth / social login (deferred to v2)
- Email confirmation requirement (auto-confirm for MVP speed)
- Full password reset flow (placeholder "Coming soon" page only)
- Profile creation UI (that's S-01)
- Any database schema changes (that's F-02)
- Custom email templates

## Implementation Approach

Three phases in dependency order: (1) infrastructure — shadcn/ui + proxy + env docs, (2) auth UI — forms powered by Server Actions, (3) protected area — dashboard + logout. Each phase is independently verifiable.

## Phase 1: Project Setup — shadcn/ui, Proxy, Environment

### Overview

Install shadcn/ui component library, create the auth session proxy, and document environment variables. After this phase, route protection works even though there are no auth pages yet.

### Changes Required:

#### 1. Install shadcn/ui

**Intent**: Add the component library so auth forms use consistent, accessible UI primitives (Button, Input, Card, Label).

**Contract**: Run `npx shadcn@latest init` (new-york style, neutral base color). Then add components: `button`, `input`, `card`, `label`. Creates `src/components/ui/`, `src/lib/utils.ts`, `components.json`. Modifies `globals.css` with theme tokens and `package.json` with dependencies (`clsx`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority`, `lucide-react`).

**Reconcile**: `init` rewrites `globals.css`. After it runs, verify the existing `--background`/`--foreground` tokens and dark-mode block are preserved — merge them into shadcn's token set if overwritten — then re-run `npm run build` to confirm styling still resolves.

#### 2. Create proxy for session refresh and route protection

**File**: `src/proxy.ts`

**Intent**: Refresh Supabase auth session on every request and enforce route protection — redirect unauthenticated users away from protected paths, redirect authenticated users away from auth pages.

**Contract**: Named export `proxy` (Next.js 16 convention). Uses `createServerClient` from `@supabase/ssr` with request/response cookie bridging. Calls `supabase.auth.getUser()` for session validation. Protected paths: anything under `/(protected)` group (resolved as `/dashboard`). Auth paths: `/login`, `/register`, `/reset-password`. Matcher excludes static assets.

```typescript
// Non-obvious: proxy.ts uses the new Next.js 16 export name
export async function proxy(request: NextRequest) { ... }
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

#### 3. Create `.env.example`

**File**: `.env.example`

**Intent**: Document required environment variables for developer onboarding.

**Contract**: Contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with placeholder values and comments.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes (proxy compiles, shadcn components resolve)
- `npm run lint` passes
- shadcn components exist: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/card.tsx`, `src/components/ui/label.tsx`

#### Manual Verification:

- Visiting `/dashboard` (once created in Phase 3) redirects to `/login`
- Proxy file is recognized by Next.js 16 without deprecation warnings

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Auth UI — Login, Register, Reset Placeholder

### Overview

Build the auth pages inside an `(auth)` route group with a shared centered layout. Forms use Server Actions for validation and Supabase auth calls. Inline error display via shadcn/ui components.

### Changes Required:

#### 1. Auth route group layout

**File**: `src/app/(auth)/layout.tsx`

**Intent**: Shared layout for login/register/reset pages — centered card on a minimal background with BarkBuddy branding.

**Contract**: Accepts `children` prop. Renders a vertically and horizontally centered container. No nav bar. Includes app name/logo at top.

#### 2. Login page

**File**: `src/app/(auth)/login/page.tsx`

**Intent**: Email+password login form. On success, redirect to `/dashboard`. On failure, show inline error. Includes links to register and reset-password.

**Contract**: Client component using shadcn `Card`, `Input`, `Button`, `Label`. Wires the login Server Action via `useActionState` to render the returned `{ error }` inline. Reads `searchParams` for a `message` query param (used by register redirect to show "Account created" success banner).

#### 3. Register page

**File**: `src/app/(auth)/register/page.tsx`

**Intent**: Email + password + confirm-password registration form. On success, redirect to `/login?message=account-created`. On failure, show inline error.

**Contract**: Uses same shadcn components as login. Validates password match client-side (confirm field) and delegates auth to Server Action. Password minimum length: 6 characters (Supabase default).

#### 4. Reset password placeholder

**File**: `src/app/(auth)/reset-password/page.tsx`

**Intent**: Placeholder page showing "Coming soon" message so the link from login isn't a dead end.

**Contract**: Static page, no form. Shows a message and a link back to login.

#### 5. Auth Server Actions

**File**: `src/app/(auth)/actions.ts`

**Intent**: Server-side handlers for login and register forms. Validate inputs, call Supabase Auth, return errors or redirect on success.

**Contract**: Exports `login` and `register` async functions with the `useActionState` signature `(prevState, formData)`. Each returns `{ error: string }` on failure or calls `redirect()` on success. Uses `createClient` from `@/lib/supabase/server`.

```typescript
// Non-obvious: must use redirect() from next/navigation AFTER the try/catch
// because redirect() throws internally — calling it inside try breaks the flow
```

#### 6. Auth callback route

**File**: `src/app/auth/callback/route.ts`

**Intent**: Handle Supabase auth callbacks (email confirmation links, password reset links). Exchange the code for a session.

**Contract**: GET route handler. Reads `code` from searchParams, calls `supabase.auth.exchangeCodeForSession(code)`, redirects to `/dashboard` on success or `/login?message=error` on failure.

**Note**: Forward-looking stub — no in-scope flow (auto-confirm, no OAuth, placeholder reset) produces a `code` this slice, so this route is not exercised yet. Kept for future email-confirmation / password-reset work.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes (all new routes compile)
- `npm run lint` passes
- Pages render without runtime errors: `/login`, `/register`, `/reset-password`

#### Manual Verification:

- Register with valid email+password → redirected to `/login` with success message
- Register with mismatched passwords → inline error shown
- Register with existing email → inline error shown
- Login with valid credentials → redirected to `/dashboard`
- Login with wrong password → inline error shown
- Login page shows links to register and reset-password
- Reset-password page shows "Coming soon" and link back to login
- Already-authenticated user visiting `/login` → redirected to `/dashboard`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Protected Area — Dashboard and Logout

### Overview

Create the `(protected)` route group with a dashboard page showing the authenticated user's email and a logout button. Logout clears the session and redirects to `/login`.

### Changes Required:

#### 1. Protected route group layout

**File**: `src/app/(protected)/layout.tsx`

**Intent**: Layout for authenticated pages. Verifies session server-side (defense in depth alongside proxy). Provides a minimal shell with logout in the header.

**Contract**: Calls `supabase.auth.getUser()` — if no user, redirects to `/login`. Renders a header with app name and logout button, plus `children` slot.

#### 2. Dashboard page

**File**: `src/app/(protected)/dashboard/page.tsx`

**Intent**: Placeholder landing page for authenticated users. Shows their email and confirms they're logged in. Future slices will replace this.

**Contract**: Server component. Reads user from Supabase session. Displays welcome message with user email. Uses shadcn `Card`.

#### 3. Logout Server Action

**File**: `src/app/(protected)/actions.ts`

**Intent**: Sign out the user and redirect to login.

**Contract**: Exports `logout` async function. Calls `supabase.auth.signOut()`, then `redirect('/login')`.

#### 4. Update root page with auth links

**File**: `src/app/page.tsx`

**Intent**: Update the landing page to include login/register links so users can navigate to auth flows.

**Contract**: Add links (or buttons) pointing to `/login` and `/register`. Keep existing BarkBuddy branding.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- `npm run lint` passes
- All routes compile: `/dashboard`, `/login`, `/register`

#### Manual Verification:

- Authenticated user sees dashboard with their email displayed
- Clicking logout → session cleared → redirected to `/login`
- After logout, visiting `/dashboard` → redirected to `/login`
- Landing page (`/`) has visible links to login and register
- Full flow: register → login → dashboard → logout → login works end-to-end

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Server Actions return appropriate errors for invalid inputs (empty email, short password, mismatched passwords)
- Proxy correctly identifies protected vs auth vs public paths

### Integration Tests:

- Full auth flow: register → login → access protected route → logout → blocked from protected route

### Manual Testing Steps:

1. Register a new account with email+password
2. Verify redirect to login with success message
3. Log in with the new credentials
4. Verify dashboard shows correct email
5. Log out and verify redirect to login
6. Attempt to visit `/dashboard` while logged out — verify redirect to `/login`
7. Log in again and visit `/login` — verify redirect to `/dashboard`
8. Register with an already-used email — verify error message
9. Login with wrong password — verify error message

## Performance Considerations

- Proxy calls `getUser()` on every request — this is a lightweight Supabase Auth API call (~50ms). Acceptable for MVP scale.
- Auth forms are thin client components (`useActionState`) for inline errors and confirm-password match; all auth logic stays in Server Actions, keeping the bundle minimal.
- shadcn/ui components are tree-shaken; only imported components are bundled.

## Migration Notes

- No database migrations required for this change.
- Supabase project must have email+password auth enabled (default setting).
- Developers need `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## References

- Roadmap: `context/foundation/roadmap.md` (F-01)
- PRD: `context/foundation/prd.md` (FR-001, FR-002, Access Control)
- Supabase SSR docs: `@supabase/ssr` package
- Next.js 16 proxy docs: `node_modules/next/dist/docs/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Project Setup — shadcn/ui, Proxy, Environment

#### Automated

- [x] 1.1 `npm run build` passes — 40291d1
- [x] 1.2 `npm run lint` passes — 40291d1
- [x] 1.3 shadcn components exist at `src/components/ui/` — 40291d1

#### Manual

- [x] 1.4 Visiting `/dashboard` redirects to `/login` — 40291d1
- [x] 1.5 Proxy recognized by Next.js 16 without deprecation warnings — 40291d1

### Phase 2: Auth UI — Login, Register, Reset Placeholder

#### Automated

- [x] 2.1 `npm run build` passes — 6cb36ea
- [x] 2.2 `npm run lint` passes — 6cb36ea
- [x] 2.3 Pages render without runtime errors: `/login`, `/register`, `/reset-password` — 6cb36ea

#### Manual

- [x] 2.4 Register with valid email+password → redirect to `/login` with success message — 6cb36ea
- [x] 2.5 Register with mismatched passwords → inline error shown — 6cb36ea
- [x] 2.6 Register with existing email → inline error shown — 6cb36ea
- [x] 2.7 Login with valid credentials → redirect to `/dashboard` — 6cb36ea
- [x] 2.8 Login with wrong password → inline error shown — 6cb36ea
- [x] 2.9 Login page shows links to register and reset-password — 6cb36ea
- [x] 2.10 Reset-password page shows "Coming soon" and link back to login — 6cb36ea
- [x] 2.11 Already-authenticated user visiting `/login` → redirect to `/dashboard` — 6cb36ea

### Phase 3: Protected Area — Dashboard and Logout

#### Automated

- [x] 3.1 `npm run build` passes — 1792510
- [x] 3.2 `npm run lint` passes — 1792510
- [x] 3.3 All routes compile: `/dashboard`, `/login`, `/register` — 1792510

#### Manual

- [x] 3.4 Authenticated user sees dashboard with their email displayed — 1792510
- [x] 3.5 Logout clears session and redirects to `/login` — 1792510
- [x] 3.6 After logout, visiting `/dashboard` → redirect to `/login` — 1792510
- [x] 3.7 Landing page (`/`) has visible links to login and register — 1792510
- [x] 3.8 Full end-to-end flow works: register → login → dashboard → logout → blocked — 1792510
