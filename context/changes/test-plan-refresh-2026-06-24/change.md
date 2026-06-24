---
change_id: test-plan-refresh-2026-06-24
title: Refresh test plan with E2E rollout phases and corrected stack info
status: implemented
created: 2026-06-24
updated: 2026-06-24
archived_at: null
---

## Notes

Open a change folder for refreshing the E2E layer of context/foundation/test-plan.md.

## Refresh scope

The current test-plan.md §4 claims "e2e: none yet" — this is stale. Playwright @1.61.0 is configured with 2 specs and E2E_RULES.md. This refresh adds three E2E rollout phases to §3 and corrects §4.

## Proposed rollout phases (to be added to §3)

| # | Phase name | Goal | Risks covered | Test types |
|---|---|---|---|---|
| 1 | E2E infra hardening | Automated auth setup project (Playwright project dependency pattern), env-based credentials, multi-browser config (Chrome + Firefox + Edge), E2E seeding helper pattern | E3 (auth fragility), E5 (cross-browser) | E2E infra |
| 2 | Onboarding pipeline E2E | Full chain: register → profile → dog → walking-area pin → dashboard → match list renders; break-at-each-step error states | E1 (pipeline breakage), E2 (empty matches after onboarding) | E2E |
| 3 | Walking-area interaction E2E | Pin drag → save confirmation → reload persistence; radius adjust → save; error feedback on server-action failure | E4 (auto-save failure) | E2E |

## Risk response guidance to carry into research

- E1: Prove fresh user completes full chain and sees match list. Challenge "each form works in isolation = chain works." Avoid testing pages without connecting redirect/gating logic.
- E2: Prove browser renders match cards for a freshly-onboarded user (not pre-seeded). Challenge "integration passes = browser shows it." Avoid reusing same pre-seeded user as existing spec.
- E3: Prove tests run without manual auth.json regeneration. Challenge "auth.json works until it doesn't." Avoid hardcoding creds outside env vars.
- E4: Prove pin drag → debounce → save → reload shows same position. Challenge "server action tested in integration = browser is fine." Avoid waitForTimeout for debounce.
- E5: Prove same suite passes on Chrome + Firefox + Edge. Challenge "works in Edge = works everywhere." Avoid adding ALL browsers at once.

## Corrections to existing test-plan.md (final sub-phase of this change)

- §4: Update E2E row from "none yet" to Playwright @1.61.0 with current config details.
- §3: Append the three new rollout phases after Phase 5.
- §7: Add "Leaflet pixel rendering" to negative-space (Interview Q5 signal, not yet in §7).

## Negative space (do NOT test at E2E level)

- UI snapshots for landing/marketing pages
- shadcn/ui component internals
- Leaflet map pixel rendering
- RLS policy correctness (already covered at integration layer)
