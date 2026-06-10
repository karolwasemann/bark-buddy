# UX Enhancement Implementation Plan

## Overview

Transform BarkBuddy from a bare scaffold into a guided, visually cohesive app. Apply Ocean Breeze theme, add toast notifications, proper navigation, redesign the landing page, enrich the dashboard with summary cards, and add contextual guidance for new users.

## Current State Analysis

- **Landing page**: Next.js boilerplate with hardcoded colors, Vercel links, Next.js logo
- **Protected layout**: Minimal header (logo + sign out), no nav links
- **Dashboard**: Single card with email + 2 plain links
- **Profile**: Read-only, no edit affordance
- **Walking area**: Best-designed page — auto-save, status feedback, but no first-time guidance
- **Theme**: Default neutral shadcn/ui palette, dark mode via `@media prefers-color-scheme` (no user toggle)
- **Notifications**: None — save status is inline text only on walking area

### Key Discoveries:

- `@custom-variant dark (&:is(.dark *))` already in `globals.css` — ready for `.dark` class strategy
- `lucide-react` installed — icons available for navigation
- `shadcn/ui` Button supports `asChild` for rendering `<Link>` elements
- No `middleware.ts` — auth is layout-based (won't conflict with theme provider)
- `sonner` is the shadcn/ui standard toast library (not yet installed)
- `next-themes` not installed — needs adding

## Desired End State

A logged-in user sees a top navbar on every protected page with active-route highlighting (icons on mobile, labels on desktop). The dashboard shows summary cards for their dog, walking area, and a "matches coming soon" teaser. New users are guided from profile creation → walking area with contextual instruction. All pages use the Ocean Breeze palette with a dark mode toggle. Success/failure actions show toast notifications. The landing page communicates the app's purpose with a short hero section.

### Verification:

- All existing routes render without error
- Navigation highlights the active route correctly
- Dark mode toggle persists across page loads
- Toast appears on walking area save/error
- Landing page shows app value proposition (no Vercel/Next.js boilerplate)
- Dashboard loads summary data for dog + walking area
- `npm run build` passes

## What We're NOT Doing

- Building the matches feature (S-03) — only a "coming soon" card
- Building profile edit form (S-05) — only the navigation link
- Adding separate `/matches` or `/messages` routes
- Adding a progress bar or onboarding wizard
- Changing the data model or database schema
- Adding middleware.ts or changing auth logic
- Social login, push notifications, or any PRD non-goals

## Implementation Approach

Bottom-up: foundation layer first (theme + toast), then pages from outside-in (landing → nav → dashboard → detail pages). Each phase is independently deployable and testable.

## Phase 1: Theme, Dark Mode & Toast System

### Overview

Install dependencies, apply Ocean Breeze palette, switch dark mode strategy, add ThemeProvider + Toaster globally, create a dark mode toggle button.

### Changes Required:

#### 1. Install dependencies

**Intent**: Add `next-themes` and `sonner` packages.

**Contract**: `npm install next-themes sonner` — adds to `dependencies` in `package.json`.

#### 2. Apply Ocean Breeze palette

**File**: `src/app/globals.css`

**Intent**: Replace the default neutral OKLCH variables with Ocean Breeze palette and switch dark mode from `@media (prefers-color-scheme: dark)` to `.dark` class selector.

**Contract**: `:root` block gets Ocean Breeze light values. The `@media (prefers-color-scheme: dark)` block is replaced with `.dark` selector block containing Ocean Breeze dark values. The `@custom-variant dark` line and `@theme inline` block remain unchanged. The `body` rule keeps `background` and `color` vars but drops the hardcoded `font-family` (font comes from CSS variable `--font-sans`).

#### 3. Add ThemeProvider wrapper

**File**: `src/app/layout.tsx`

**Intent**: Wrap the app in `next-themes` ThemeProvider so dark mode class is managed automatically. Add `suppressHydrationWarning` to `<html>` to prevent flash.

**Contract**: `<html>` gets `suppressHydrationWarning`. `<body>` children wrapped in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`. Import from `next-themes`.

#### 4. Add Toaster component

**File**: `src/app/layout.tsx`

**Intent**: Mount the `sonner` Toaster globally so any page can trigger toasts.

**Contract**: `<Toaster />` from `sonner` placed as a sibling inside the ThemeProvider, after `{children}`. Uses `richColors` prop for success/error styling.

#### 5. Create dark mode toggle

**File**: `src/components/ThemeToggle.tsx`

**Intent**: A small button that cycles between light/dark/system themes. Will be placed in the navigation header.

**Contract**: Client component using `useTheme()` from `next-themes`. Renders a `<Button variant="ghost" size="icon">` with Sun/Moon icon from `lucide-react`. Toggles between `light` and `dark` on click.

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Lint passes: `npm run lint`
- No TypeScript errors

#### Manual Verification:

- App renders with Ocean Breeze aqua/coastal colors
- Dark mode toggle switches theme without page reload
- Theme persists across navigation and page refresh
- Toast component renders when triggered (testable in next phases)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Landing Page Redesign

### Overview

Replace the boilerplate landing page with a short hero section communicating BarkBuddy's value proposition, using semantic color tokens from Ocean Breeze.

### Changes Required:

#### 1. Rewrite landing page

**File**: `src/app/page.tsx`

**Intent**: Replace Next.js boilerplate with a hero section: headline ("Find walking buddies for your dog"), 2-3 short benefit bullets, and Sign in / Create account CTA buttons. Use semantic tokens (`bg-background`, `text-foreground`, `text-primary`) instead of hardcoded colors. Keep the 🐾 branding. Remove Next.js logo, Vercel links, and template text.

**Contract**: Default export `Home` component. Uses `Link` from `next/link` for CTAs. Layout: centered flex column, responsive padding. CTA buttons use `<Button asChild>` wrapping `<Link>`. No external images or assets — use emoji/gradient for visual interest. All colors via semantic Tailwind classes (no hardcoded hex/oklch/zinc).

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- No hardcoded color values (`bg-zinc-*`, `bg-[#...]`, `dark:bg-[#...]`) in `page.tsx`

#### Manual Verification:

- Landing page shows app-specific content (no Vercel/Next.js references)
- CTA buttons navigate to `/login` and `/register`
- Page looks good in both light and dark mode
- Responsive: readable on 375px mobile

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Navigation Component

### Overview

Create a responsive navigation bar for the protected layout. Icons-only on mobile, icons + labels on desktop. Active route highlighting. Includes theme toggle and sign-out.

### Changes Required:

#### 1. Create Navigation component

**File**: `src/components/Navigation.tsx`

**Intent**: Client component rendering nav links (Dashboard, Walking Area, Profile) with active-route detection via `usePathname()`. On mobile (`< md`), show icons only from `lucide-react` (Home, MapPin, User). On `md+`, show icons + text labels. Active link gets `variant="default"`, inactive gets `variant="ghost"`.

**Contract**: Named export `Navigation`. Uses `Button` with `asChild` + `Link`. Nav items array: `{ href, label, icon }`. Active detection: `pathname.startsWith(href)`. Responsive: icons via `lucide-react` (Home, MapPin, User), labels hidden below `md` with `className="hidden md:inline"`. Includes `aria-label` on icon-only buttons for accessibility.

#### 2. Update protected layout header

**File**: `src/app/(protected)/layout.tsx`

**Intent**: Replace the bare header with a proper navbar containing: brand link (🐾 BarkBuddy → `/dashboard`), `<Navigation />`, theme toggle, and sign-out button.

**Contract**: Header structure: `<brand> <Navigation /> <div>[ThemeToggle] [SignOut]</div>`. Brand is a `Link` to `/dashboard`. Sign-out remains a form with server action (existing pattern). Layout stays a server component — `Navigation` and `ThemeToggle` are client components composed inside it.

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification:

- Nav links visible on all protected pages
- Active route is visually distinguished
- Mobile (< 640px): icons only, no text labels
- Desktop: icons + labels
- Brand logo links to `/dashboard`
- Theme toggle and sign-out work from nav
- No layout shift on route transitions

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Dashboard Enrichment

### Overview

Replace the sparse dashboard with summary cards showing the user's dog, walking area status, and a "matches coming soon" teaser.

### Changes Required:

#### 1. Rewrite dashboard page

**File**: `src/app/(protected)/(gated)/dashboard/page.tsx`

**Intent**: Show 3 cards in a responsive grid: (1) Dog card — name, breed, photo thumbnail, link to `/profile`; (2) Walking Area card — "Area set ✓" with radius info or "Not set yet" CTA to `/walking-area`; (3) Matches card — "Coming soon" with a clock/lock icon, brief text explaining the feature is on its way. Each card is a `<Card>` linking to its detail page.

**Contract**: Server component. Fetches `profiles`, `dogs` (with signed photo URL), and `walking_pins` for the current user. Uses existing Card components. Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Dog photo uses same signed-URL pattern as profile page. Walking area card conditionally shows radius or CTA. Matches card is static content (no data fetch).

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- TypeScript compiles without errors

#### Manual Verification:

- Dashboard shows 3 cards with real user data
- Dog card displays photo (or 🐾 fallback)
- Walking area card shows radius when set, CTA when not set
- Matches card shows "Coming soon" text
- Cards link to correct detail pages
- Responsive grid: stacks on mobile, 2-3 columns on desktop

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Walking Area & Profile Polish

### Overview

Add first-time guidance to the walking area, wire toast notifications for save feedback, add "Edit" link on profile page, and redirect profile creation to walking area.

### Changes Required:

#### 1. Add pulsing pin + instruction text

**Files**: `src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx`, `src/components/MapView.tsx`, `src/app/globals.css`, `src/app/(protected)/(gated)/walking-area/page.tsx`

**Intent**: When the user hasn't saved a walking pin yet, show a pulsing animation on the map marker and instruction text above the map: "Drop your pin where you walk your dog — this helps us find nearby dog walkers for you."

**Contract**:
- `page.tsx` passes `isFirstVisit={!initialData}` prop to `WalkingAreaClient` (true when user has no `walking_pins` DB row).
- `WalkingAreaClient` accepts `isFirstVisit` boolean prop. Shows instruction banner above the map when `isFirstVisit && !hasMoved`. Sets `hasMoved=true` on first `handleMapChange` call, which dismisses the text. Instruction text uses `text-muted-foreground`.
- `MapView` accepts an optional `markerClassName?: string` prop. When provided, creates the marker with `L.divIcon({ className: markerClassName, html: '...', iconSize: [25, 41], iconAnchor: [12, 41] })` instead of the default icon. On first drag, reverts to default `L.Icon.Default`.
- `globals.css` defines `.marker-pulse` with a `@keyframes` scale/opacity animation (not Tailwind `animate-pulse` — Leaflet markers live outside React DOM).
- `WalkingAreaClient` passes `markerClassName="marker-pulse"` to `MapView` when `isFirstVisit && !hasMoved`.

#### 2. Wire toast notifications for save status

**File**: `src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx`

**Intent**: Replace the inline status text with toast notifications for save success and error. Keep "Saving…" as inline text (it's transient), but show `toast.success("Walking area saved")` on success and `toast.error("Failed to save")` on error.

**Contract**: Import `toast` from `sonner`. On `status === "saved"`, call `toast.success(...)`. On `status === "error"`, call `toast.error(...)`. Remove the `<p>` status line or keep only the "Saving…" state inline.

#### 3. Add "Edit profile" link

**File**: `src/app/(protected)/(gated)/profile/page.tsx`

**Intent**: Add an "Edit profile" link/button pointing to `/profile/edit`. The edit page itself does not ship in this change (S-05 scope) but the navigation affordance should exist.

**Contract**: Add a `<Button variant="outline" asChild>` wrapping `<Link href="/profile/edit">Edit profile</Link>` above or below the profile cards. Replace the "Go to dashboard" underline link (nav now handles that).

#### 4. Redirect profile creation to walking area

**File**: `src/app/(protected)/profile/actions.ts`

**Intent**: After successful profile+dog creation, redirect the user to `/walking-area` instead of `/dashboard` so they continue the setup flow without losing momentum.

**Contract**: Change the `redirect()` target from `/profile` to `/walking-area` in the `createProfile` server action's success path (line 84 of `actions.ts`).

### Success Criteria:

#### Automated Verification:

- Build passes: `npm run build`
- Lint passes: `npm run lint`

#### Manual Verification:

- Walking area shows instruction text + pulsing indicator when pin is at default Berlin location
- Moving the pin dismisses the instruction text
- Saving the pin triggers a success toast
- A save failure triggers an error toast
- Profile page shows "Edit profile" button (links to `/profile/edit` — 404 is expected until S-05)
- Creating a new profile redirects to `/walking-area`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No unit test framework is reliably set up for component testing — skip for this UX change
- Vitest config exists but no component test utilities configured

### Integration Tests:

- Not applicable for this UX-focused change

### Manual Testing Steps:

1. Visit `/` — see hero with value prop, CTA buttons work
2. Register a new account → create profile → verify redirect to `/walking-area`
3. On walking area: see pulsing pin + instruction text → move pin → instruction disappears → toast on save
4. Navigate via top navbar → verify active highlighting on each page
5. Check dashboard → 3 cards with real data
6. Toggle dark mode → verify persistence after navigation
7. Check all pages at 375px mobile width — icons only in nav, cards stack
8. Profile page → "Edit profile" button visible

## Performance Considerations

- `next-themes` adds ~2KB (client). Negligible.
- `sonner` adds ~5KB (client). Acceptable for toast UX.
- Dashboard fetches 3 small queries (profile, dog, walking_pin) — all on same Supabase instance, sub-100ms.
- No new client-side state management or heavy dependencies.

## References

- Research: `context/changes/ui-ux-enhancment/research.md`
- Ocean Breeze palette: `context/changes/ui-ux-enhancment/ui-docs.md`
- Roadmap: `context/foundation/roadmap.md`
- Protected layout: `src/app/(protected)/layout.tsx`
- Existing walking area: `src/app/(protected)/(gated)/walking-area/WalkingAreaClient.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Theme, Dark Mode & Toast System

#### Automated

- [x] 1.1 Build passes after theme + provider changes — f59397a
- [x] 1.2 Lint passes — f59397a
- [x] 1.3 No TypeScript errors — f59397a

#### Manual

- [x] 1.4 Ocean Breeze colors render correctly (light mode) — f59397a
- [x] 1.5 Dark mode toggle works and persists — f59397a
- [x] 1.6 Toast component mounts (verifiable in Phase 5) — f59397a

### Phase 2: Landing Page Redesign

#### Automated

- [x] 2.1 Build passes — 25138b1
- [x] 2.2 No hardcoded color values in page.tsx — 25138b1

#### Manual

- [x] 2.3 Landing shows app-specific content — 25138b1
- [x] 2.4 CTAs navigate to login/register — 25138b1
- [x] 2.5 Responsive on 375px mobile — 25138b1

### Phase 3: Navigation Component

#### Automated

- [x] 3.1 Build passes — 25138b1
- [x] 3.2 Lint passes — 25138b1

#### Manual

- [x] 3.3 Active route visually distinguished — 25138b1
- [x] 3.4 Mobile: icons only — 25138b1
- [x] 3.5 Desktop: icons + labels — 25138b1
- [x] 3.6 Theme toggle and sign-out in nav — 25138b1

### Phase 4: Dashboard Enrichment

#### Automated

- [x] 4.1 Build passes — 25138b1
- [x] 4.2 TypeScript compiles — 25138b1

#### Manual

- [x] 4.3 3 cards with real data displayed — 25138b1
- [x] 4.4 Walking area card shows status/CTA — 25138b1
- [x] 4.5 Responsive grid layout — 25138b1

### Phase 5: Walking Area & Profile Polish

#### Automated

- [x] 5.1 Build passes — 25138b1
- [x] 5.2 Lint passes — 25138b1

#### Manual

- [x] 5.3 Pulsing pin + instruction text on first visit — 25138b1
- [x] 5.4 Toast on save success/error — 25138b1
- [x] 5.5 Edit profile link on profile page — 25138b1
- [x] 5.6 Profile creation redirects to walking area — 25138b1
