# Match List — Plan Brief

> Full plan: `context/changes/match-list/plan.md`

## What & Why

Users with overlapping walking areas need to see who they've matched with. This is the north-star slice (S-03) — the smallest end-to-end flow that proves the core product hypothesis: hyper-local matching by walking area works. The `find_matches()` backend is already complete; this plan builds the frontend.

## Starting Point

- `find_matches()` RPC function exists and works (returns profile + dog info + distance bucket, LIMIT 50)
- Dashboard has a placeholder "Coming soon" Matches card
- Navigation has 3 items (no Matches link)
- Dog photos are in an owner-only Storage bucket — non-owners can't download directly
- No `.rpc()` usage exists yet in the frontend

## Desired End State

A logged-in user with a walking pin visits `/matches` and sees a responsive card grid of matched users. Each card shows the dog's photo, name, breed, owner's name + bio, a color-coded distance badge, and a disabled "Invite to walk" button. The nav bar includes Matches. The dashboard card shows a live count.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
|----------|--------|-------------------|
| List layout | Card grid (1/2/3 cols responsive) | Matches existing dashboard pattern; dog-photo-first draws attention |
| Detail view | No separate page — all info on card | Too little data for a full page; avoids empty-feeling route |
| Dog photo access | Server-side signed URLs (60s TTL) | No RLS changes needed; follows existing dashboard photo pattern |
| Invitation button | Disabled + "Coming soon" tooltip | Communicates intended flow without throwaway code |
| Empty states | Two: no pin + no matches | Guides user through both failure modes with clear next action |
| Nav position | Dashboard, Walking Area, **Matches**, Profile | Follows user journey: set area → see matches |
| Dashboard card | Live count + distance breakdown + link | Motivates click-through; mirrors live data on other cards |

## Scope

**In scope:**
- `/matches` page with card grid
- `MatchCard` component (photo, info, distance badge, disabled invite button)
- Two empty states (no pin / no matches)
- Navigation: add Matches item
- Dashboard: replace "Coming soon" with live match data
- Server-side signed URLs for match dog photos
- Error handling for RPC failures

**Out of scope:**
- Walk invitation functionality (S-04)
- Match filtering/sorting (FR-012, deferred)
- Storage RLS policy changes
- Schema migrations
- Real-time updates

## Architecture / Approach

```
/matches (server component)
  → supabase.rpc('find_matches', { requesting_user_id })
  → Promise.all(signedUrls for each match photo)
  → render card grid (or empty state)

/dashboard (server component)
  → same RPC call added to existing Promise.all
  → render count + breakdown in Matches card
```

Pure server-rendered pages. No client state needed. Signed URLs generated at render time.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Match List Page & Cards | `/matches` route, RPC call, signed URLs, card grid, empty states, disabled button | First `.rpc()` usage — type mismatch possible |
| 2. Navigation & Dashboard | Nav item + live dashboard card with match count | Extra RPC on dashboard — must not slow page load |
| 3. Polish & Verification | Responsive grid, a11y, error state, end-to-end test | Minimal risk — refinement only |

**Prerequisites:** F-02 (geo function) and S-02 (walking pin) are done. Two test users with overlapping pins needed for manual verification.
**Estimated effort:** ~1-2 sessions across 3 phases.

## Open Risks & Assumptions

- Signed URL generation for 50 matches (worst case) — `Promise.all` should keep it under 1-2 seconds, but verify
- `find_matches()` returns `dog_photo_path` which may be null (dog uploaded without photo edge case — handled with placeholder)
- First `.rpc()` call in the app — if Supabase types don't auto-generate for functions, may need manual typing

## Success Criteria (Summary)

- Two users with overlapping walking areas see each other in `/matches` with correct photos and distance badges
- Users without a pin or without matches see clear, guiding empty states
- `npm run build` passes with zero regressions
