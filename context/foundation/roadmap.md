---
project: "BarkBuddy"
version: 1
status: draft
created: 2026-05-27
updated: 2026-05-27
prd_version: 1
main_goal: market-feedback
top_blocker: time
---

# Roadmap: BarkBuddy

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Miejscy właściciele psów w blokach nie mają lekkiego sposobu, by umówić się na wspólny spacer bez smyczy z innym psem z okolicy. Istniejące rozwiązania matchują statycznie po profilu psa i po całym mieście. BarkBuddy dopasowuje po obszarze spaceru (pin + promień) — hyper-lokalnie, na poziomie trasy, nie miasta. Psy są pierwszorzędnym wymiarem dopasowania; ludzie się poznają przy okazji.

## North star

**S-03: Matching end-to-end** — zalogowany użytkownik z profilem, psem (ze zdjęciem) i pinem na mapie widzi listę matchy posortowaną po dystansie.

> Gwiazda przewodnia (north star) to najmniejszy wycinek end-to-end, którego dostarczenie udowadnia hipotezę produktową — umieszczony najwcześniej, jak pozwalają zależności, bo reszta ma sens tylko jeśli to działa.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | supabase-auth-scaffold | (foundation) auth flows landed; register, login, logout, route protection via middleware | — | FR-001, FR-002, Access Control | ready |
| F-02 | data-schema-and-geo | (foundation) Supabase Postgres schema with users, dogs, pins, geo-overlap matching function | — | FR-005, FR-006, Business Logic, NFR privacy lokalizacji | ready |
| S-01 | user-and-dog-profile | user can create their profile (display name + bio) and their dog's profile (name, breed, photo) | F-01 | FR-003, FR-004, FR-011, US-01 | proposed |
| S-02 | walking-area-pin | user can place a pin on a map and set a radius to mark their walking area | S-01 | FR-005, US-01 | proposed |
| S-03 | match-list | user can view a list of matched users (overlap ≥10% smaller circle) sorted by distance, and open match details | F-02, S-02 | FR-006, FR-007, US-01, NFR privacy lokalizacji, NFR time-to-first-match | proposed |
| S-04 | walk-invitation-and-messaging | user can send a walk-invitation, recipient accepts/declines, then both exchange free-text messages | S-03 | FR-008, FR-009, FR-013, FR-014, US-01 | proposed |
| S-05 | edit-profile-names | user can edit their display name and their dog's name after creation | S-01 | FR-010 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Core matching | `F-01` → `S-01` → `S-02` → `S-03` → `S-04` | Main path to north star and beyond; sequenced for market-feedback. |
| B | Data & geo | `F-02` | Joins Stream A at `S-03` (match-list requires geo function). |
| C | Profile maintenance | `S-05` | Parallel with S-02+; standalone typo-fix capability. |

## Baseline

What's already in place in the codebase as of 2026-05-27 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — Next.js 16 + React 19 + Tailwind 4 configured; only default page.tsx, no app routes. shadcn/ui planned (not yet installed).
- **Backend / API:** partial — Supabase client helpers at `src/lib/supabase/{client,server}.ts`; no API routes, server actions, or business logic.
- **Data:** partial — `@supabase/supabase-js` installed with client wrappers; no schema, migrations, or seed data.
- **Auth:** partial — `@supabase/ssr` installed, client/server helpers exist; no auth flows, middleware, or session checks.
- **Deploy / infra:** partial — `vercel.json` (fra1 region) + `.github/workflows/ci.yml`; no IaC.
- **Observability:** absent — no logging, error tracking, or metrics configured.

## Foundations

### F-01: Auth scaffold (Supabase Auth)

- **Outcome:** (foundation) auth flows landed; users can register with email+password, log in, log out, and unauthenticated visitors are redirected to login from gated routes.
- **Change ID:** supabase-auth-scaffold
- **PRD refs:** FR-001, FR-002, Access Control
- **Unlocks:** S-01 (user-and-dog-profile), S-02, S-03, S-04, S-05 — every slice requires an authenticated user.
- **Prerequisites:** —
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Supabase Auth email+password is well-documented; low technical risk. Sequenced first because every slice depends on a logged-in user.
- **Status:** ready

### F-02: Data schema and geo-matching function

- **Outcome:** (foundation) Supabase Postgres schema deployed with tables for users, dogs, walking-area pins; a database function computing circle-overlap matches (≥10% of smaller circle) sorted by pin distance; row-level security enforcing location privacy.
- **Change ID:** data-schema-and-geo
- **PRD refs:** FR-005, FR-006, Business Logic, NFR privacy lokalizacji
- **Unlocks:** S-03 (match-list) — the north star slice cannot function without the geo-matching query.
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Geo-overlap calculation (circle intersection area ≥10% of smaller circle) requires correct math — either PostGIS or a custom PL/pgSQL function. This is the deepest technical investment in the roadmap; sequenced early because the north star depends on it and errors here propagate.
- **Status:** ready

## Slices

### S-01: User and dog profile creation

- **Outcome:** user can create their profile (display name + short bio) and their dog's profile (name, breed, photo uploaded to Supabase Storage).
- **Change ID:** user-and-dog-profile
- **PRD refs:** FR-003, FR-004, FR-011, US-01
- **Prerequisites:** F-01
- **Parallel with:** S-05 (once S-01 itself is done, S-05 can run parallel with S-02)
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Dog photo upload (FR-011) adds Supabase Storage integration; slightly more surface than a pure form, but well-documented. Sequenced right after auth because profiles are the first user-visible state.
- **Status:** proposed

### S-02: Walking area pin on map

- **Outcome:** user can place a pin on an interactive map and set a radius (circle) to mark their walking area.
- **Change ID:** walking-area-pin
- **PRD refs:** FR-005, US-01
- **Prerequisites:** S-01
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Requires a map component (e.g., Leaflet or Mapbox GL). Choice of map library is a `/10x-plan` decision, not a roadmap one. Sequenced after profile because the pin is stored against the user record.
- **Status:** proposed

### S-03: Match list (north star)

- **Outcome:** user can view a list of other users whose walking-area circles overlap with theirs (≥10% of smaller circle), sorted by pin-to-pin distance, and can open a match's full profile (including dog photo visible only to matches).
- **Change ID:** match-list
- **PRD refs:** FR-006, FR-007, US-01, NFR privacy lokalizacji, NFR privacy zdjęć psa, NFR time-to-first-match
- **Prerequisites:** F-02, S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This is the validation milestone — the smallest end-to-end flow that proves the core product hypothesis (hyper-local matching by walking area works). Privacy NFR enforcement (never expose pin/radius/overlap to other users) must be verified at this stage. Sequenced as early as prerequisites allow.
- **Status:** proposed

### S-04: Walk invitation and messaging

- **Outcome:** user can send a pre-formatted walk-invitation (place, date, time) to a matched user; recipient can accept or decline; after acceptance both parties exchange free-text async messages in their inbox.
- **Change ID:** walk-invitation-and-messaging
- **PRD refs:** FR-008, FR-009, FR-013, FR-014, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Messaging is the second-largest slice (4 FRs). Structured invitation gating first contact is a deliberate UX choice from PRD — must not degrade to open free-text. Sequenced after matching because you can only message someone you've matched with.
- **Status:** proposed

### S-05: Edit profile names

- **Outcome:** user can edit their display name and their dog's name after initial creation (typo-fix scope).
- **Change ID:** edit-profile-names
- **PRD refs:** FR-010
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Minimal scope (two text fields). Sequenced late because it doesn't block any other slice and the time blocker favors deferring non-critical work.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | supabase-auth-scaffold | Implement Supabase Auth: register, login, logout, middleware | yes | Run `/10x-plan supabase-auth-scaffold` |
| F-02 | data-schema-and-geo | Design Postgres schema + geo-overlap matching function | yes | Run `/10x-plan data-schema-and-geo` |
| S-01 | user-and-dog-profile | User + dog profile creation with photo upload | no | Needs F-01 done |
| S-02 | walking-area-pin | Map view: place pin + set radius | no | Needs S-01 done |
| S-03 | match-list | Match list: geo-overlap query + privacy-safe display | no | Needs F-02 + S-02 done |
| S-04 | walk-invitation-and-messaging | Walk invitation + accept/decline + free-text inbox | no | Needs S-03 done |
| S-05 | edit-profile-names | Edit display name + dog name | no | Needs S-01 done |

## Open Roadmap Questions

1. **Którzy providerzy OAuth lądują w v2** (gdy OAuth wraca po MVP)? — Owner: user. Block: roadmap-wide (no — post-MVP).
2. **Jak skalować matching rule przy 10k+ użytkowników w mieście?** — Owner: user. Block: roadmap-wide (no — post-MVP).
3. **Brak powiadomień (push/email/SMS) o nowej wiadomości jest ryzykiem dla 14-dniowego primary outcome.** — Owner: user. Block: roadmap-wide (no — akceptowane ryzyko v1).

## Parked

- **FR-012: Filtrowanie/sortowanie listy matchy** — Why parked: nice-to-have per PRD; no v1 metadata to filter on (size/age not collected). Time blocker = aggressive parking.
- **Powiadomienia push/email/SMS** — Why parked: PRD §Non-Goals; pull-based inbox accepted for v1.
- **OAuth sign-in** — Why parked: PRD §Non-Goals; email+password is sufficient for validation.
- **Moderacja społeczności** — Why parked: PRD §Non-Goals; flat user model, no admin in MVP.
- **Multi-pet per user** — Why parked: PRD §Non-Goals; one account = one dog in v1.
- **Time-window matching ("tu i teraz")** — Why parked: PRD §Non-Goals; static area overlap in v1.
- **Observability (logging, error tracking)** — Why parked: no NFR gates launch on it; time blocker favors deferring. Revisit post-MVP.

## Done

