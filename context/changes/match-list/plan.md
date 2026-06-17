# Match List Implementation Plan

## Overview

Build the `/matches` page that displays a card grid of matched users from the existing `find_matches()` RPC function, with server-side signed URLs for dog photos, two empty states, a disabled "Invite to walk" button, navigation integration, and a live-data dashboard card.

## Current State Analysis

- `find_matches(requesting_user_id uuid)` RPC exists and returns: `profile_id`, `display_name`, `bio`, `dog_name`, `dog_breed`, `dog_photo_path`, `distance_bucket` (LIMIT 50, sorted by distance)
- No `.rpc()` usage in the codebase yet — this is the first
- `dog-photos` bucket is owner-only — signed URLs must be generated server-side (existing pattern on dashboard for own dog)
- Dashboard has a placeholder "Coming soon" Matches card
- Navigation has 3 items: Dashboard, Walking Area, Profile
- UI: shadcn/ui cards, lucide-react icons, Tailwind 4 oklch tokens
- Data fetching pattern: server component calls Supabase → passes data to client component if interactivity needed

### Key Discoveries:

- `supabase/migrations/20260610092307_create_find_matches_function.sql` — the function is ready and tested
- `src/app/(protected)/(gated)/dashboard/page.tsx:130-140` — current "Coming soon" card to replace
- `src/components/Navigation.tsx:10-13` — current 3-item navItems array
- `src/app/(protected)/(gated)/walking-area/page.tsx` — pattern for server component data fetching with error/empty handling
- Lesson: "Storage RLS must align with function-level access" — signed URLs bypass this cleanly

## Desired End State

A user with a walking pin set opens `/matches` and sees a responsive card grid of matched users. Each card shows: dog photo, dog name, breed, owner display name, bio, distance badge, and a disabled "Invite to walk" button with "Coming soon" tooltip. Users without a pin see a guiding empty state. The nav bar includes "Matches" between Walking Area and Profile. The dashboard card shows a live match count with distance breakdown.

**Verification**: `npm run build` passes. Manual test: two users with overlapping pins see each other in `/matches` with correct photos and distance badges.

## What We're NOT Doing

- Separate match detail page (all info fits on the card)
- Walk invitation functionality (S-04)
- Filtering or sorting matches (FR-012, nice-to-have, deferred)
- Real-time match updates (page reload shows new matches)
- Storage RLS policy changes (signed URLs solve photo access)
- Any schema migrations or database changes

## Implementation Approach

Server component fetches matches via `.rpc()`, generates signed URLs for each match's dog photo in parallel, then renders a card grid. Two empty states handle "no pin" and "no matches" cases. Navigation and dashboard get minor updates to reference the new route.

---

## Phase 1: Match List Page & Cards

### Overview

Create the `/matches` route with RPC call, signed URL generation, card grid UI, empty states, and disabled invitation button.

### Changes Required:

#### 1. Match list page (server component)

**File**: `src/app/(protected)/(gated)/matches/page.tsx`

**Intent**: Fetch matches via `supabase.rpc('find_matches')`, generate signed URLs for dog photos, determine which empty state to show (no pin vs no matches), and render the card grid.

**Contract**: 
- Calls `supabase.rpc('find_matches', { requesting_user_id: user.id })` 
- Checks `walking_pins` existence to differentiate empty states
- Generates signed URLs via `supabase.storage.from('dog-photos').createSignedUrl(path, 60)` for each match with a photo
- Passes enriched match data (with `signedPhotoUrl`) to the card grid
- Named export: `MatchesPage` (default export for route)

#### 2. Match card component

**File**: `src/components/MatchCard.tsx`

**Intent**: Display a single match's info in a card: dog photo, dog name, breed, owner name + bio, distance badge, and a disabled "Invite to walk" button with tooltip text.

**Contract**:
- Props: `{ displayName: string; bio: string | null; dogName: string; dogBreed: string; photoUrl: string | null; distanceBucket: 'nearby' | 'moderate' | 'far' }`
- Uses shadcn/ui `Card`, `Button` components
- Distance badge uses color-coded styling (green/yellow/orange for nearby/moderate/far)
- Disabled button with "Coming soon" text below or as title attribute
- Client component (`"use client"`) only if tooltip requires interactivity — otherwise server component

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Lint passes: `npm run lint`
- Route exists: `/matches` resolves without 404

#### Manual Verification:

- User with overlapping pin sees match cards with correct data
- Dog photos render via signed URLs
- Distance badges show correct bucket labels
- "Invite to walk" button is visible but disabled
- Empty state A: user without walking pin sees "Set your walking area" message + link
- Empty state B: user with pin but no overlapping users sees "No matches yet" message

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Navigation & Dashboard Update

### Overview

Add "Matches" to the navigation bar and replace the dashboard "Coming soon" card with a live match count + distance breakdown.

### Changes Required:

#### 1. Navigation update

**File**: `src/components/Navigation.tsx`

**Intent**: Add a "Matches" nav item between Walking Area and Profile, using the `Heart` (or `Users`) icon from lucide-react.

**Contract**: Insert `{ href: "/matches", label: "Matches", icon: Heart }` at index 2 in the `navItems` array. Import `Heart` from `lucide-react`.

#### 2. Dashboard matches card

**File**: `src/app/(protected)/(gated)/dashboard/page.tsx`

**Intent**: Replace the static "Coming soon" Matches card with a live card showing match count and distance breakdown (e.g., "3 nearby, 2 moderate, 1 far"), linking to `/matches`.

**Contract**:
- Add `supabase.rpc('find_matches', { requesting_user_id: user.id })` to the existing `Promise.all` data fetch
- Replace the `{/* Matches card */}` block with a `Link` to `/matches` wrapping a card that displays count + breakdown
- If no pin exists (walkingPin is null), show "Set walking area to find matches"
- If pin exists but 0 matches, show "No matches yet"
- Remove the `opacity-75` class and `Clock` icon from the card

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification:

- Navigation shows 4 items in correct order: Dashboard, Walking Area, Matches, Profile
- Active state highlights correctly on `/matches`
- Dashboard card shows live match count with distance breakdown
- Dashboard card links to `/matches`
- Dashboard card shows appropriate message when no pin / no matches

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Polish & Verification

### Overview

Ensure responsive layout, accessibility, and end-to-end correctness.

### Changes Required:

#### 1. Responsive card grid

**File**: `src/app/(protected)/(gated)/matches/page.tsx`

**Intent**: Ensure the card grid is responsive — 1 column on mobile, 2 on md, 3 on lg — matching the dashboard grid pattern.

**Contract**: Grid container uses `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` (same as dashboard).

#### 2. Accessibility for disabled button

**File**: `src/components/MatchCard.tsx`

**Intent**: Ensure the disabled "Invite to walk" button is accessible — has `aria-disabled`, descriptive `title` attribute, and visible "Coming soon" helper text.

**Contract**: Button has `disabled`, `title="Walk invitations coming soon"`, and a `<span className="text-xs text-muted-foreground">` below it with "Coming soon".

#### 3. Loading/error state

**File**: `src/app/(protected)/(gated)/matches/page.tsx`

**Intent**: Handle the case where the RPC call fails gracefully — show a user-friendly error message rather than crashing.

**Contract**: If `.rpc()` returns an error, render an error card: "Something went wrong loading matches. Please try again."

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification:

- Cards stack in 1 column on mobile, 2 on tablet, 3 on desktop
- Disabled button has correct aria attributes and tooltip
- Forced RPC error (e.g., invalid function name in dev) shows friendly error message
- Full end-to-end: two users with overlapping pins see each other with photos, badges, and disabled invite button

**Implementation Note**: After completing this phase and all verification passes, the match-list feature (S-03) is complete.

---

## Testing Strategy

### Manual Testing Steps:

1. Register User A — create profile + dog (with photo) + set walking pin
2. Register User B — create profile + dog (with photo) + set overlapping pin
3. Log in as User A → navigate to `/matches` → expect User B's card with photo and distance badge
4. Log in as User B → navigate to `/matches` → expect User A's card
5. Test empty state: new User C with no pin → see "Set your walking area" message
6. Test empty state: User C sets pin in remote location → see "No matches yet" message
7. Test dashboard: User A sees "2 matches" (or whatever count) with breakdown
8. Test navigation: "Matches" nav item is between Walking Area and Profile, active when on `/matches`

### Edge Cases to Verify:

- Match with no dog photo (photo_path is null) → show placeholder (🐾 emoji or muted background)
- Match with very long bio → truncate with `line-clamp`
- 50 matches (max) → page remains performant, grid scrolls naturally
- User deletes their walking pin → `/matches` shows empty state A on next visit

## Performance Considerations

- Signed URL generation: up to 50 parallel `createSignedUrl` calls — use `Promise.all` for concurrency
- RPC call is pre-optimized with `ST_DWithin` spatial index pre-filter
- No client-side state or re-renders needed — pure server component rendering
- 60-second signed URL TTL is sufficient (page is server-rendered fresh each visit)

## References

- Geo-matching function: `supabase/migrations/20260610092307_create_find_matches_function.sql`
- Dashboard pattern: `src/app/(protected)/(gated)/dashboard/page.tsx`
- Walking area pattern: `src/app/(protected)/(gated)/walking-area/page.tsx`
- Navigation: `src/components/Navigation.tsx`
- Lesson: `context/foundation/lessons.md` — "Storage RLS must align with function-level access"
- PRD: FR-006 (match list), FR-007 (match details), NFR privacy lokalizacji, NFR privacy zdjęć psa

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Match List Page & Cards

#### Automated

- [x] 1.1 Build passes: `npm run build` — 8dbbafa
- [x] 1.2 Lint passes: `npm run lint` — 8dbbafa
- [x] 1.3 Route `/matches` resolves without 404 — 8dbbafa

#### Manual

- [x] 1.4 Match cards render with correct data and photos — 8dbbafa
- [x] 1.5 Distance badges show correct bucket labels — 8dbbafa
- [x] 1.6 "Invite to walk" button visible but disabled — 8dbbafa
- [x] 1.7 Empty state A: no walking pin → guidance message + link — 8dbbafa
- [x] 1.8 Empty state B: pin set, no matches → "No matches yet" message — 8dbbafa

### Phase 2: Navigation & Dashboard Update

#### Automated

- [x] 2.1 Build passes: `npm run build` — 784f26b
- [x] 2.2 Lint passes: `npm run lint` — 784f26b

#### Manual

- [x] 2.3 Navigation shows 4 items in correct order — 784f26b
- [x] 2.4 Active state highlights on `/matches` — 784f26b
- [x] 2.5 Dashboard card shows live match count + distance breakdown — 784f26b
- [x] 2.6 Dashboard card links to `/matches` — 784f26b

### Phase 3: Polish & Verification

#### Automated

- [x] 3.1 Build passes: `npm run build`
- [x] 3.2 Lint passes: `npm run lint`

#### Manual

- [x] 3.3 Responsive grid: 1/2/3 columns at mobile/tablet/desktop
- [x] 3.4 Disabled button has aria attributes and tooltip
- [x] 3.5 Error state renders friendly message on RPC failure
- [x] 3.6 End-to-end: two users with overlapping pins see each other
