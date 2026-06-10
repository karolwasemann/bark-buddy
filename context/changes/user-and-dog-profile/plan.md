# User and Dog Profile Implementation Plan

## Overview

Slice S-01: let a logged-in BarkBuddy user create their own profile (display name + short bio) and a profile for their dog (name, breed, optional photo), then gate the app so every user reaches a complete profile before continuing. This is the first persisted data model in the project — it establishes the schema, migration, Storage, and RLS conventions that F-02 (geo) and later slices inherit.

PRD refs: FR-003 (owner profile), FR-004 (dog profile), FR-011 (dog photo capability), US-01.

## Current State Analysis

- **Auth (F-01) is done and reviewed.** Established patterns to follow:
  - Server Actions with `useActionState` signature `(prevState, formData)` — `src/app/(auth)/actions.ts`.
  - Defensive FormData reads: `formData.get("x")?.toString() ?? ""` (recorded lesson — never `as string`).
  - shadcn/ui primitives present: `button`, `input`, `card`, `label` in `src/components/ui/`.
  - `(protected)` route group with a `getUser()` guard in `src/app/(protected)/layout.tsx`; redirects to `/login` if no user.
  - `next/link` for internal navigation (recorded lesson — not raw `<a>`).
  - Supabase clients: `createClient()` server (`src/lib/supabase/server.ts`, async, cookie-bridged) and browser (`src/lib/supabase/client.ts`).
  - `redirect()` called AFTER any try/catch (it throws internally).
- **No persisted data exists yet.** No `supabase/` directory, no migrations, no tables, no Storage buckets. This slice introduces all of it.
- **Env:** only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured. No service-role key — RLS does the access control.
- **Vitest** is configured (`vitest.config.mts`) with one example test; `npm run test` runs `vitest run`.

### Key Discoveries:

- Protected layout already resolves the user via `getUser()` (`src/app/(protected)/layout.tsx:9-14`) — the onboarding gate hooks in here, adding a single profile-completeness query.
- Dashboard (`src/app/(protected)/dashboard/page.tsx`) is the current post-login landing — it becomes the "completed profile" destination.
- The dog-photo privacy NFR ("never available under any public URL") forces a private bucket + signed URLs from day one; matching (S-03) later widens read access to active matches.

## Desired End State

A logged-in user with no profile is redirected to `/profile/new`, fills owner (display name + optional bio) and dog (name, breed, optional photo) sections, submits once, and lands on a profile view showing their saved data (with the dog photo rendered via a signed URL when present). Until both `profiles` and `dogs` rows exist, every protected route bounces them back to `/profile/new`. RLS guarantees a user can only read/write their own profile, dog, and photo.

### Verification:

- `npm run build` and `npm run lint` pass.
- Manual: fresh user → forced to `/profile/new` → submit → profile view shows data → revisiting `/dashboard` works → a second user cannot read the first's rows or photo.

## What We're NOT Doing

- **No `walking_area_pins` table and no geo-matching function** — those belong to F-02. This slice narrows F-02's roadmap scope to pins + geo only.
- **No editing** of profile/dog fields after creation — that's S-05 (edit-profile-names).
- **No match-scoped photo read access** — S-03 widens RLS to active matches; S-01 only grants owner access.
- **No multi-dog support** — schema enforces one dog per user (PRD Non-Goal).
- **No owner profile photo or year-of-birth** — deferred to v2 per FR-003.
- **No required dog photo** — optional at creation by decision (see Key Decisions); FR-011's "can attach" capability is still delivered.
- **No automated DB/RLS/Storage tests** — manual verification, matching F-01.

## Implementation Approach

Three phases in dependency order, mirroring F-01's infra → UI → integration shape: (1) schema + Storage + RLS via Supabase CLI migrations; (2) the single-page creation flow with optional photo upload; (3) the onboarding gate and profile view. Each phase is independently verifiable.

## Critical Implementation Details

- **Ordered writes, then photo (Phase 2).** The optional photo is uploaded client-side to Storage *before* form submit, yielding a `photo_path` string the Server Action stores. The action writes `profiles` then `dogs`. If the `dogs` insert fails after a photo was uploaded, the orphaned object must be cleaned up (delete by path) so abandoned uploads don't accumulate. Profile/dog rows are the source of truth; the photo is a pointer.
- **Private Storage path convention.** Store the photo at a deterministic per-user path (`<auth-uid>/dog.<ext>`) so the Storage RLS policy can authorize by matching the first path segment to `auth.uid()`. Upload with `upsert: true` so re-selecting a file overwrites the prior object instead of orphaning it; if the new file has a different extension, delete any existing object under the `<auth-uid>/` prefix first so only one photo per user ever exists. The DB stores the object path, never a URL. **Known residual**: if the user selects a photo and then closes the tab without submitting, that one object can't be cleaned up client-side — accepted for this slice.
- **Signed URLs are read-time only (Phase 3).** The profile view mints a short-lived signed URL server-side from the stored path; no public URL is ever generated or persisted.

## Phase 1: Schema, Storage & RLS

### Overview

Introduce the Supabase CLI and the first migrations: `profiles` and `dogs` tables, a private `dog-photos` Storage bucket, and owner-scoped RLS on both tables and the bucket. After this phase the data layer exists and is locked down, even though no UI writes to it yet.

### Changes Required:

#### 1. Supabase CLI + migration scaffolding

**File**: `supabase/` (new), `supabase/config.toml`, `package.json`

**Intent**: Establish the versioned-migration convention the whole project will use. Add the Supabase CLI as a dev dependency and initialize the local Supabase project structure.

**Contract**: `supabase` CLI added to `devDependencies` (pinned). `supabase init` creates `supabase/config.toml` and the `supabase/migrations/` directory. Document the apply command (`supabase db push` after `supabase link`) in the migration notes / README. Migrations are applied against the existing hosted Supabase project, not a new local one.

#### 2. `profiles` table migration

**File**: `supabase/migrations/<timestamp>_create_profiles.sql`

**Intent**: Store the owner profile, keyed 1:1 to the auth user.

**Contract**: Table `profiles` — `id uuid primary key references auth.users(id) on delete cascade`, `display_name text not null` (1–50 enforced via check), `bio text` (nullable, ≤300 via check), `created_at timestamptz not null default now()`. Enable RLS. Policies: a user can `select`/`insert`/`update` only the row where `id = auth.uid()`.

#### 3. `dogs` table migration

**File**: `supabase/migrations/<timestamp>_create_dogs.sql`

**Intent**: Store the dog profile, one per owner in MVP, with an optional photo pointer.

**Contract**: Table `dogs` — `id uuid primary key default gen_random_uuid()`, `owner_id uuid not null unique references profiles(id) on delete cascade` (unique enforces one-dog-per-user), `name text not null` (1–50 via check), `breed text not null` (1–50 via check), `photo_path text` (nullable), `created_at timestamptz not null default now()`. Enable RLS. Policies: a user can `select`/`insert`/`update` only rows where `owner_id = auth.uid()`.

#### 4. Private `dog-photos` Storage bucket + RLS migration

**File**: `supabase/migrations/<timestamp>_create_dog_photos_bucket.sql`

**Intent**: Create the private bucket and authorize each user to read/write only objects under their own UID prefix.

**Contract**: Insert a `storage.buckets` row `dog-photos` with `public = false`. RLS policies on `storage.objects` for that bucket: `insert`/`select`/`update`/`delete` allowed only when `bucket_id = 'dog-photos'` and the first path segment equals `auth.uid()::text` (i.e. `(storage.foldername(name))[1] = auth.uid()::text`). No public read policy.

```sql
-- Non-obvious: authorize by matching the first folder segment of the object path to the caller's uid
create policy "owner can read own dog photos"
on storage.objects for select
using ( bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text );
```

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- `npm run lint` passes
- Migration files exist under `supabase/migrations/` and are valid SQL (parse without error)

#### Manual Verification:

- Migrations apply cleanly to the hosted project (`supabase db push` succeeds)
- `profiles` and `dogs` tables exist with RLS enabled (verified in Supabase dashboard)
- `dog-photos` bucket exists and is private (no public access)
- A direct API read of another user's profile/dog/photo is denied by RLS

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Profile Creation Flow

### Overview

Build `/profile/new` as a single page with owner and dog sections and one submit. The Server Action validates inputs and writes both rows; an optional photo is uploaded client-side to Storage first and its path passed through. Mirror the auth slice's Server Action + `useActionState` patterns.

### Changes Required:

#### 1. Profile creation page

**File**: `src/app/(protected)/profile/new/page.tsx`

**Intent**: Single-page form with an owner section (display name, optional bio) and a dog section (name, breed, optional photo). Client component using shadcn `Card`/`Input`/`Label`/`Button`, wired to the create Server Action via `useActionState` for inline errors and pending state.

**Contract**: Renders both sections in one `<form>`. Optional photo `<input type="file" accept="image/jpeg,image/png,image/webp">`; on file selection, upload to the `dog-photos` bucket via the browser Supabase client to the deterministic path `<uid>/dog.<ext>` with `upsert: true` (re-select overwrites rather than orphans; on an extension change, remove any existing object under the `<uid>/` prefix first), hold the returned path in a hidden field. Client-side guards: type in {jpeg,png,webp}, size ≤5MB. Submit posts owner fields, dog fields, and the optional `photo_path`. Lives at `src/app/(protected)/profile/new/page.tsx` — under `(protected)` (auth guard applies) but OUTSIDE the new `(gated)` group, so the completeness gate never redirects it onto itself.

#### 2. Profile creation Server Action

**File**: `src/app/(protected)/profile/actions.ts`

**Intent**: Validate inputs server-side, persist `profiles` then `dogs`, clean up an orphaned photo if the dog insert fails, and redirect to the profile view on success.

**Contract**: Exports `createProfile(prevState, formData)` returning `{ error: string, values?: {...} }` on failure or `redirect("/profile")` on success. Reads fields with `?.toString() ?? ""` (no `as string`). Validates: display name 1–50, bio ≤300 (optional), dog name 1–50, breed 1–50, and if `photo_path` present, re-check extension is jpeg/png/webp and the path's first segment equals the caller's uid. Upsert `profiles` with `onConflict: "id"` (id = `auth.uid()`) so a retry after a partial failure succeeds rather than dup-keying — then insert `dogs` (owner_id = same). This matters because the gate keys on the `dogs` row: if `profiles` lands but `dogs` fails, the user is bounced back to `/profile/new` and re-submits, and a plain `insert profiles` would dup-key and brick them (no edit flow until S-05). The upsert requires the RLS UPDATE policy (see Phase 1 §2) to cover `auth.uid()`. On `dogs` failure when a `photo_path` was supplied, delete that Storage object before returning the error. `redirect()` is called after the try/catch.

```typescript
// Non-obvious: redirect() throws — call it only after the write block, never inside try
```

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- `npm run lint` passes
- `/profile/new` route compiles and renders without runtime error

#### Manual Verification:

- Submitting valid owner + dog (no photo) creates both rows and redirects to `/profile`
- Submitting with a valid photo uploads it and stores `photo_path`
- Oversized (>5MB) or wrong-type file is rejected with an inline error
- Empty display name / dog name / breed shows an inline validation error (no row written)
- Bio over 300 chars is rejected
- A simulated `dogs`-insert failure after photo upload leaves no orphaned object in the bucket

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Onboarding Gate & Profile View

### Overview

Gate the protected area so users without a complete profile are redirected to `/profile/new`, and add a profile view that renders the saved owner + dog data, including the dog photo via a server-minted signed URL when present.

### Changes Required:

#### 1. Onboarding gate in a nested (gated) layout

**File**: `src/app/(protected)/(gated)/layout.tsx` (new)

**Intent**: Run the profile-completeness check for everything that requires a complete profile, while keeping `/profile/new` reachable. The existing `src/app/(protected)/layout.tsx` keeps only the `getUser()` auth guard (applies to all protected routes incl. `/profile/new`); the new nested `(gated)` layout adds the completeness gate and wraps only the gated routes (`dashboard`, profile view).

**Contract**: New `(protected)/(gated)/layout.tsx` runs a single query for the user's `dogs` row (its existence implies `profiles` exists, since `dogs.owner_id` FKs to `profiles`). If absent, `redirect("/profile/new")`. Because `/profile/new` lives in `(protected)` but OUTSIDE `(gated)`, the gate never runs for it — no pathname lookup, no loop. Reuse the already-fetched `user` (resolve via `getUser()` once in this layout; the parent layout's guard already ensures a user exists). Route groups don't change URLs, so `/dashboard` and `/profile` keep their paths.

#### 2. Profile view page

**File**: `src/app/(protected)/(gated)/profile/page.tsx` (under the gated group)

**Intent**: Display the user's profile (display name, bio) and dog (name, breed, photo). Server component reading the user's rows; mints a short-lived signed URL from `dogs.photo_path` when present.

**Contract**: Server component. Query `profiles` and `dogs` for `auth.uid()`. If `photo_path` is set, create a signed URL (short TTL) via the server Supabase client and render it with a plain `<img>` (NOT `next/image`): the Supabase storage host isn't in `images.remotePatterns` (next.config.ts is empty), so next/image would throw; and next/image's optimizer would cache the optimized copy beyond the signed-URL TTL, defeating the privacy intent. A plain `<img>` needs no host allow-list and never caches the private asset. Otherwise render a neutral placeholder (no broken image, no public URL). Uses shadcn `Card`. Internal links via `next/link`.

#### 3. Post-completion landing

**File**: `src/app/(protected)/(gated)/dashboard/page.tsx` (moved under the gated group; and/or `next/link` entries)

**Intent**: Ensure a completed user has a coherent landing — dashboard remains reachable and links to the profile view.

**Contract**: Add a `next/link` to `/profile` from the dashboard. No behavior change to the auth display. (Trim candidate per Q11 if time runs short: the profile view's photo rendering is the optional polish; the text profile + gate are core.)

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- `npm run lint` passes
- `/profile` and `/profile/new` routes compile

#### Manual Verification:

- A user with no profile hitting any protected route is redirected to `/profile/new` (no redirect loop)
- After creation, the user is no longer redirected and can reach `/dashboard` and `/profile`
- The profile view shows display name, bio, dog name, breed
- A dog photo renders via a signed URL; with no photo, a placeholder shows
- A second logged-in user cannot view the first user's photo (signed URL is owner-scoped; no public URL exists)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- None added for this slice by decision (manual verification only, matching F-01). Validation logic lives in the Server Action and is covered by the manual checks below.

### Integration Tests:

- None. RLS, Storage, and the gate are verified manually against the hosted Supabase project.

### Manual Testing Steps:

1. As a fresh registered user, hit `/dashboard` → confirm redirect to `/profile/new`.
2. Submit owner + dog with no photo → confirm both rows created and redirect to `/profile`.
3. Revisit `/dashboard` → confirm no redirect (gate satisfied).
4. Create (as a second user) and upload a valid photo → confirm it renders on `/profile`.
5. Attempt an oversized / wrong-type upload → confirm inline rejection.
6. Submit empty display name / dog name / breed → confirm inline error, no row written.
7. From a second account, attempt to read the first account's profile/dog/photo via the API → confirm RLS denies it.

## Performance Considerations

- The onboarding gate adds one lightweight `dogs` existence query per protected navigation, reusing the already-fetched user (no extra `getUser()`). Acceptable at MVP scale.
- Photo bytes go client→Storage directly, keeping the Server Action payload small and avoiding Vercel's ~4MB action body limit.
- Signed URLs are minted at render with a short TTL; no caching of private URLs.

## Migration Notes

- First migrations in the project. Apply with `supabase db push` after `supabase link` to the hosted project.
- Migrations are non-destructive (new tables/bucket only); no existing data to migrate.
- Going multi-dog in v2 = drop the `dogs.owner_id` unique constraint (cheap, non-destructive).
- F-02 will add the `walking_area_pins` table and geo function as separate migrations.

## References

- Roadmap: `context/foundation/roadmap.md` (S-01)
- PRD: `context/foundation/prd.md` (FR-003, FR-004, FR-011, US-01, NFR privacy zdjęć psa)
- Lessons: `context/foundation/lessons.md` (defensive FormData reads, no redundant getUser(), next/link for internal nav)
- Auth slice patterns: `context/changes/supabase-auth-scaffold/plan.md`; `src/app/(auth)/actions.ts`, `src/app/(protected)/layout.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema, Storage & RLS

#### Automated

- [x] 1.1 `npm run build` passes
- [x] 1.2 `npm run lint` passes
- [x] 1.3 Migration files exist under `supabase/migrations/` and parse as valid SQL

#### Manual

- [x] 1.4 Migrations apply cleanly (`supabase db push` succeeds)
- [x] 1.5 `profiles` and `dogs` tables exist with RLS enabled
- [x] 1.6 `dog-photos` bucket exists and is private
- [x] 1.7 Cross-user API read of profile/dog/photo is denied by RLS

### Phase 2: Profile Creation Flow

#### Automated

- [ ] 2.1 `npm run build` passes
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `/profile/new` route compiles and renders without runtime error

#### Manual

- [ ] 2.4 Valid owner + dog (no photo) creates both rows and redirects to `/profile`
- [ ] 2.5 Valid photo uploads and `photo_path` is stored
- [ ] 2.6 Oversized / wrong-type file is rejected inline
- [ ] 2.7 Empty display name / dog name / breed shows inline error, no row written
- [ ] 2.8 Bio over 300 chars is rejected
- [ ] 2.9 Simulated dog-insert failure after upload leaves no orphaned object

### Phase 3: Onboarding Gate & Profile View

#### Automated

- [ ] 3.1 `npm run build` passes
- [ ] 3.2 `npm run lint` passes
- [ ] 3.3 `/profile` and `/profile/new` routes compile

#### Manual

- [ ] 3.4 User with no profile is redirected to `/profile/new` (no loop)
- [ ] 3.5 After creation, no redirect; `/dashboard` and `/profile` reachable
- [ ] 3.6 Profile view shows display name, bio, dog name, breed
- [ ] 3.7 Dog photo renders via signed URL; placeholder when absent
- [ ] 3.8 Second user cannot view the first user's photo (no public URL)
