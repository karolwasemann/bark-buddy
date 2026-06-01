# Supabase Auth Scaffold — Plan Brief

> Full plan: `context/changes/supabase-auth-scaffold/plan.md`

## What & Why

Implement email+password authentication (register, login, logout) with route protection for BarkBuddy. This is foundation F-01 — every subsequent feature (profiles, map, matching, messaging) requires an authenticated user. Without it, no slice can ship.

## Starting Point

Supabase client helpers (`src/lib/supabase/client.ts` and `server.ts`) are already implemented with `@supabase/ssr`. The app has a single landing page, no auth UI, no middleware/proxy, no route protection, and no component library. The Supabase project exists but auth flows aren't wired up.

## Desired End State

A user can register with email+password, log in, see a protected dashboard confirming their session, and log out. Unauthenticated visitors are automatically redirected to `/login` from any protected route. Sessions refresh transparently on every navigation. The UI uses shadcn/ui components for a clean, consistent look.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Route structure | `(auth)` + `(protected)` route groups | Clean separation of concerns; auth pages share a centered layout, protected pages share a nav shell. |
| Post-signup flow | Redirect to login with success message | Simplest path — no email infra needed for MVP; user knows next step immediately. |
| Protected landing | `/dashboard` placeholder | Proves auth works end-to-end; future slices replace it naturally. |
| Form handling | Server Actions + inline errors | No client JS for validation; aligns with Next.js 16 patterns; keeps bundle small. |
| Password reset | "Coming soon" placeholder page | Keeps scope tight for 2-week timeline; link exists so UX isn't confusing. |
| Component library | shadcn/ui installed in this change | Consistent design system from day one; future slices reuse same components. |
| Route protection | Next.js 16 `proxy.ts` with session refresh | Single source of truth; standard Supabase pattern; sessions never go stale. |

## Scope

**In scope:**
- shadcn/ui installation (button, input, card, label)
- `proxy.ts` for session refresh + route protection
- `.env.example` for developer onboarding
- Login page with email+password form
- Register page with email+password+confirm form
- Reset-password placeholder page ("Coming soon")
- Server Actions for login/register
- Auth callback route for code exchange
- Protected dashboard with user email display
- Logout functionality
- Landing page auth links

**Out of scope:**
- OAuth / social login
- Email confirmation requirement
- Full password reset flow
- Profile creation (S-01)
- Database schema (F-02)
- Custom email templates

## Architecture / Approach

```
proxy.ts (session refresh + redirect logic)
├── (auth)/layout.tsx (centered card layout)
│   ├── login/page.tsx → Server Action → Supabase signInWithPassword
│   ├── register/page.tsx → Server Action → Supabase signUp
│   └── reset-password/page.tsx (static placeholder)
├── (protected)/layout.tsx (nav shell + session check)
│   └── dashboard/page.tsx (user email + logout)
├── auth/callback/route.ts (code → session exchange)
└── actions.ts (login, register, logout Server Actions)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Project Setup | shadcn/ui + proxy.ts + .env.example | shadcn init may conflict with existing globals.css theme tokens |
| 2. Auth UI | Login, register, reset placeholder + Server Actions | Supabase error messages may need mapping to user-friendly text |
| 3. Protected Area | Dashboard + logout + landing page links | None significant — straightforward wiring |

**Prerequisites:** Supabase project with email+password auth enabled; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` available.
**Estimated effort:** ~1-2 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes Supabase project has email auth enabled with auto-confirm (no email verification for MVP)
- `proxy.ts` is the correct Next.js 16 convention — if the project's Next.js version doesn't support it, fallback to `middleware.ts` with deprecation warning
- shadcn/ui init modifies `globals.css` — existing theme tokens may need reconciliation

## Success Criteria (Summary)

- User can register, log in, see their email on dashboard, and log out — full round-trip works
- Unauthenticated access to `/dashboard` redirects to `/login`; authenticated access to `/login` redirects to `/dashboard`
- `npm run build && npm run lint` pass with zero errors
