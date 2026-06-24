# Test Plan Refresh — Plan Brief

> Full plan: `context/changes/test-plan-refresh-2026-06-24/plan.md`
> Research: `context/changes/test-plan-refresh-2026-06-24/research.md`

## What & Why

Refresh `context/foundation/test-plan.md` to reflect that Playwright E2E testing is live (§4 still says "none yet") and to define three E2E rollout phases covering the gaps research identified: no automated auth, no multi-browser, no E2E coverage of the onboarding pipeline or walking-area interaction.

## Starting Point

Playwright 1.61.0 is configured with 2 specs (`seed.spec.ts`, `match-list-renders.spec.ts`), `E2E_RULES.md`, and a single-browser (Edge) setup using manual `storageState: auth.json`. The test-plan doesn't reflect any of this — its §4 E2E row says "none yet" and §3 has no E2E phases.

## Desired End State

The test-plan accurately describes the current E2E stack, contains a clear 3-phase E2E rollout roadmap (Phases 6-8) that can be executed via `/10x-e2e`, and includes "Leaflet pixel rendering" in the negative-space section to prevent future scope confusion.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Phase numbering | Continue sequence (6, 7, 8) | Simple, no restructuring, existing Phase 1-5 references stay valid. | Plan |
| §3a coverage | Add to "Not implemented" table | Keeps §3a as the single status-of-the-world view, consistent with how Phases 2-5 are already listed. | Plan |
| §4 detail level | One-line notes | Matches existing row style (Vitest, @testing-library rows). | Plan |
| §7 approach | Extend existing Leaflet entry | Avoids near-duplicate bullet; adds parenthetical "(pixel rendering, tile loading, zoom animations)". | Plan |

## Scope

**In scope:**
- §4 E2E row correction (Playwright 1.61.0 details)
- §3 Phases 6-8 (E2E infra hardening, onboarding pipeline, walking-area interaction)
- §3a "Not implemented" entries for Phases 6-8
- §7 "Leaflet pixel rendering" addition
- §8 freshness dates stamped to 2026-06-24

**Out of scope:**
- Writing actual Playwright tests
- Modifying playwright.config.ts or any code
- Changing existing Phases 1-5
- CI configuration

## Architecture / Approach

Four sequential edits to a single file (`context/foundation/test-plan.md`). Each phase targets one section. Order: fix the factual error first (§4), add forward-looking content (§3, §3a), then extend boundaries (§7+§8).

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. §4 Stack correction | Accurate E2E row with Playwright 1.61.0 | Wording too verbose for one-line style |
| 2. §3 Rollout phases | Phases 6-8 in the rollout table | Risk number mapping (E1-E5 → §2 risks) |
| 3. §3a Status update | "Not implemented" entries for Phases 6-8 | Notation consistency |
| 4. §7+§8 Negative space & freshness | Pixel rendering exclusion + date stamp | Near-duplication with existing Leaflet entry |

**Prerequisites:** None — pure document edit.
**Estimated effort:** ~1 session, single phase implementable in one pass.

## Open Risks & Assumptions

- Assumes the E-prefixed risk notation (E1-E5) from change.md maps cleanly to §2 risk numbers — verified in research but implementer should double-check
- §7 existing Leaflet entry wording may need slight adjustment if the parenthetical doesn't read naturally

## Success Criteria (Summary)

- `test-plan.md` §4 shows Playwright 1.61.0 (not "none yet")
- §3 contains 8 phases with E2E phases 6-8 clearly scoped
- All sections pass a formatting/consistency visual check
