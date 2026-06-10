# User and Dog Profile — Plan Brief

> Full plan: `context/changes/user-and-dog-profile/plan.md`

## What & Why

Slice S-01: a logged-in BarkBuddy user creates their own profile (display name + short bio) and their dog's profile (name, breed, optional photo). This is the first persisted data model in the project — without it there's no profile for the matching slices (S-02/S-03) to consume, and US-01's precondition ("a logged-in user with a personal profile and a dog profile") can't be met.

## Starting Point

Auth (F-01) is done and reviewed: Server Actions + `useActionState`, shadcn/ui, a `(protected)` route group with a `getUser()` guard, and Supabase server/browser clients. There is no database schema, no migrations, and no Storage bucket yet — this slice introduces all of it and sets the conventions F-02 and later slices inherit.

## Desired End State

A fresh user is forced to `/profile/new`, fills owner + dog sections, submits once, and lands on a profile view showing their data (dog photo via a signed URL when present). Until both rows exist, protected routes redirect back to creation. RLS guarantees each user can only read/write their own profile, dog, and photo — no public photo URL ever exists.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Schema ownership vs F-02 | S-01 owns `profiles` + `dogs`; F-02 owns pins + geo | Each slice owns the schema it uses; keeps roadmap's "S-01 needs only F-01" dependency intact | Plan |
| Migration tooling | Supabase CLI, versioned `supabase/migrations/*.sql` | Version-controlled, reproducible — the standard convention F-02 will reuse | Plan |
| Photo storage | Private bucket + signed URLs + owner-scoped RLS now | Honors the "never a public URL" privacy NFR by construction | Plan |
| Data model | `profiles.id = auth.users.id` (1:1); `dogs.owner_id` unique → profiles | Trivial RLS (`auth.uid() = id`); enforces one-dog-per-user at schema level | Plan |
| Onboarding | Gate in protected layout → redirect to `/profile/new` until complete | Guarantees US-01's precondition and a clear next step for fresh users | Plan |
| Form shape | Single page, owner + dog sections, one submit | Fastest path to a complete profile (supports <5min NFR) | Plan |
| Upload | Client→Storage direct, JPEG/PNG/WebP ≤5MB, server re-validates | Keeps large bytes off the Server Action; server check is the real guard | Plan |
| Photo requiredness | **Optional** at creation | MVP friction call; still delivers FR-011's "can attach" capability | Plan |
| Field validation | Required names + breed (≤50); bio optional (≤300) | Prevents empty/oversized data while keeping friction low | Plan |
| Testing | Manual verification only | Proportional to a 2-week MVP; matches F-01 precedent | Plan |
| Cut line | Core = schema + form + RLS + gate; trim = photo polish | Guarantees a usable text profile even if photo work slips | Plan |

## Scope

**In scope:** `profiles` + `dogs` schema & RLS; private `dog-photos` bucket & RLS; Supabase CLI migration convention; `/profile/new` creation flow; optional photo upload; onboarding gate; profile view with signed-URL photo rendering.

**Out of scope:** pins / geo / matching (F-02, S-03); profile editing (S-05); match-scoped photo access (S-03); multi-dog; owner photo & year-of-birth (v2); automated DB/RLS/Storage tests.

## Architecture / Approach

Three phases, infra → UI → integration (mirroring F-01): (1) Supabase CLI + migrations create the two tables and the private bucket with owner-scoped RLS; (2) a single `/profile/new` page + Server Action persists both rows, with the optional photo uploaded client-side to Storage first and its path passed through (orphan cleanup on failure); (3) the protected-layout gate redirects incomplete users, and a profile view renders the saved data with a server-minted signed URL for the photo.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema, Storage & RLS | Tables + private bucket + owner RLS via CLI migrations | RLS/Storage policy correctness; first migration convention |
| 2. Profile creation flow | `/profile/new` + Server Action + optional upload | Orphaned photo on a failed dog insert; upload edge cases |
| 3. Onboarding gate & profile view | Layout gate + profile view + signed-URL photo | Redirect loop on `/profile/new`; signed-URL scoping |

**Prerequisites:** F-01 (done). Access to the hosted Supabase project for `supabase link` + `db push`.
**Estimated effort:** ~2–3 after-hours sessions across 3 phases.

## Open Risks & Assumptions

- **Photo optional** deviates from FR-011's must-have framing; accepted as an MVP friction trade-off (S-03 is where photos truly matter). The upload capability still ships.
- **Layout-path awareness:** the gate must exempt `/profile/new` to avoid a redirect loop; if the layout can't read the current path cleanly, the exemption moves to the page or the subtree (plan notes the fallback).
- **No automated RLS tests:** a policy regression would surface only in manual checks — acceptable for MVP, revisit when matching widens access in S-03.

## Success Criteria (Summary)

- A fresh user is reliably routed to create a profile, completes it in one submit, and reaches a profile view showing their owner + dog data.
- A dog photo, when uploaded, renders only to its owner via a signed URL — never under a public URL, and not to other users.
- Every user who clears the gate has both a `profiles` and a `dogs` row, satisfying US-01's precondition for downstream slices.
