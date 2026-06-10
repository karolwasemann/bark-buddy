# UX Enhancement — Plan Brief

> Full plan: `context/changes/ui-ux-enhancment/plan.md`
> Research: `context/changes/ui-ux-enhancment/research.md`

## What & Why

BarkBuddy's current UI is a functional scaffold — boilerplate landing page, no navigation, sparse dashboard, no theme. Users don't know what to do next or where to go. This change transforms it into a guided, visually cohesive app by applying the Ocean Breeze theme, adding proper navigation, toast notifications, and contextual guidance.

## Starting Point

The app has working auth, profile creation with dog photo upload, and a walking-area map with auto-save. But pages use default neutral colors, there's no nav bar (just a logo + sign out), the dashboard shows only 2 plain links, and the landing page still has Next.js boilerplate. The `@custom-variant dark` line already exists in CSS.

## Desired End State

A new user lands on a clear value-prop page, registers, creates their profile, and is guided straight to the walking area with instruction text. A returning user sees a navbar highlighting where they are, a dashboard with summary cards (dog, walking area, matches coming soon), and receives toast feedback on actions. The whole app wears the Ocean Breeze coastal palette with a dark mode toggle.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-------------------|--------|
| Navigation type | Top navbar (icons on mobile, labels on desktop) | Only 3-4 routes; sidebar premature, bottom tabs uncommon in web. | Plan |
| Landing page | Short hero + CTA | Communicates purpose without over-engineering for MVP with no users. | Plan |
| Post-onboard redirect | → Walking area | Keeps momentum toward time-to-first-match NFR (< 5 min). | Plan |
| Empty state (matches) | "Coming soon" card on dashboard only | No throwaway routes; honest about current state. | Plan |
| Dashboard content | Summary cards (dog, area, matches) | Fills the page meaningfully with real data; guides to incomplete steps. | Plan |
| Progress indication | Inline nudges per page | No progress bar — only 3 steps; overkill for MVP. | Plan |
| Profile edit | Link to /profile/edit (page ships with S-05) | Navigation affordance now, implementation later per roadmap. | Plan |
| Map first-visit UX | Pulsing pin on Berlin + instruction text | User sees the map immediately (engaging) with clear guidance. | Plan |
| Mobile nav | Compact icons, no labels | One-tap access without hamburger; aria-labels for accessibility. | Plan |
| Theme | Ocean Breeze + next-themes in same PR | Visual uplift IS the UX improvement; CSS is ready in ui-docs.md. | Research |
| Notifications | sonner (toast) for success/error | shadcn/ui standard; fills the "no notification system" gap. | Research |

## Scope

**In scope:**
- Ocean Breeze theme + dark mode toggle (`next-themes`)
- Toast notification system (`sonner`)
- Landing page redesign (hero + CTA)
- Top navbar with active-route highlighting
- Dashboard with 3 summary cards
- Walking area: pulsing pin + instruction text + toast feedback
- Profile page: "Edit" link
- Post-profile redirect to walking area

**Out of scope:**
- Matches feature (S-03), messaging (S-04), profile edit form (S-05)
- New database schema or API changes
- Onboarding wizard, progress bar, placeholder routes
- Auth changes, middleware, social login

## Architecture / Approach

Layered bottom-up: global providers first (ThemeProvider, Toaster in root layout), then page-by-page improvements. Navigation is a client component (`usePathname`) composed inside the server-rendered protected layout. Dashboard fetches existing data (profiles, dogs, walking_pins) — no new queries or schema changes. All styling via semantic Tailwind tokens from Ocean Breeze CSS variables.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Theme, Dark Mode & Toast | Ocean Breeze palette + next-themes + sonner | Hydration mismatch if suppressHydrationWarning missed |
| 2. Landing Page Redesign | Value-prop hero replacing boilerplate | Minimal risk — single file replacement |
| 3. Navigation Component | Responsive navbar with active route | Client/server component boundary — must not break layout |
| 4. Dashboard Enrichment | 3 summary cards with live data | Extra Supabase queries — low risk (small data) |
| 5. Walking Area & Profile Polish | First-time guidance, toasts, edit link, redirect | Pulsing animation on map marker needs CSS/Leaflet compat |

**Prerequisites:** None — all dependencies (lucide-react, shadcn/ui, Supabase) already installed. Only `next-themes` and `sonner` need adding.
**Estimated effort:** ~2-3 sessions across 5 phases.

## Open Risks & Assumptions

- `next-themes` + Next.js 16 — assumed compatible (widely used, but Next 16 is new)
- Pulsing animation on Leaflet marker — may need custom CSS class on the marker element rather than a React wrapper
- `/profile/edit` will 404 until S-05 ships — acceptable, button still communicates intent

## Success Criteria (Summary)

- User can navigate the entire app without confusion (navbar, contextual guidance)
- Pages feel purposeful — no boilerplate, no empty screens
- `npm run build` passes with zero regressions
