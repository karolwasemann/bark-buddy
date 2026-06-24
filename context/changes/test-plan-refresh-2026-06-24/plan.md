# Test Plan Refresh — E2E Rollout Phases + Stack Correction

## Overview

Edit `context/foundation/test-plan.md` to reflect the current Playwright E2E state (§4), add three E2E rollout phases (§3), update implementation status (§3a), and extend negative-space (§7). Pure document change — no code modifications.

## Current State Analysis

- §4 E2E row says "none yet — see Phase 5" — **stale** since Playwright 1.61.0 is configured with 2 specs
- §3 has 5 rollout phases covering integration/contract/CI — no E2E phases exist
- §3a tracks Phase 1 (partial) and Phases 2-5 in "Not implemented" — no E2E entries
- §7 lists shadcn/ui and Leaflet map rendering but NOT "Leaflet pixel rendering" specifically (existing entry says "trust the library; we test pin data reaches props" — but the wording needs the explicit "pixel rendering" exclusion per Interview Q5 signal)

### Key Discoveries:

- `playwright.config.ts` — Edge-only, `storageState: "auth.json"` (manual), `fullyParallel: true`, `webServer: npm run dev`
- `e2e/seed.spec.ts` + `e2e/match-list-renders.spec.ts` — 2 active specs
- `e2e/E2E_RULES.md` — established conventions (locators, waits, independence, anti-patterns)
- `@playwright/test: 1.61.0` pinned in package.json
- Existing §7 "Leaflet map rendering" entry covers the concept but doesn't use the "pixel rendering" phrasing from the interview signal

## Desired End State

After this plan is complete:
- §4 E2E row accurately describes Playwright 1.61.0 with current config
- §3 contains Phases 6-8 for E2E rollout (infra hardening → onboarding pipeline → walking-area interaction)
- §3a "Not implemented" table includes Phases 6-8 with risks and what's needed
- §7 includes explicit "Leaflet pixel rendering" entry
- §8 Freshness Ledger updated with today's date

Verification: read `context/foundation/test-plan.md` and confirm all 4 sections are updated.

## What We're NOT Doing

- Writing Playwright tests (that's `/10x-e2e` after this plan ships)
- Modifying playwright.config.ts or any code files
- Changing existing phases 1-5 status or content
- Adding CI configuration

## Implementation Approach

Sequential edits to a single file (`context/foundation/test-plan.md`), bottom-up: fix the factual error first (§4), then add forward-looking content (§3, §3a), then extend boundaries (§7), then stamp freshness (§8).

## Phase 1: §4 Stack Correction

### Overview

Replace the stale "none yet" E2E row with accurate Playwright details.

### Changes Required:

#### 1. E2E row in §4 table

**File**: `context/foundation/test-plan.md`

**Intent**: Correct the E2E row to reflect Playwright 1.61.0 is installed and configured with 2 specs.

**Contract**: Replace the current row:
```
| e2e | none yet — see Phase 5 | — | Playwright recommended if e2e gate is justified after Phase 4 |
```
with:
```
| e2e | Playwright | 1.61.0 | testDir: ./e2e, Edge-only (multi-browser planned Phase 6), storageState auth, 2 specs + E2E_RULES.md |
```

### Success Criteria:

#### Automated Verification:

- §4 table contains a row with `Playwright | 1.61.0`
- No mention of "none yet" remains in the E2E row

#### Manual Verification:

- One-line notes are consistent in length/style with the Vitest and @testing-library rows

---

## Phase 2: §3 E2E Rollout Phases

### Overview

Append Phases 6-8 to the existing rollout table, continuing the sequence after Phase 5.

### Changes Required:

#### 1. Three new rows in §3 rollout table

**File**: `context/foundation/test-plan.md`

**Intent**: Add the three E2E rollout phases defined in `change.md`, covering risks E1-E5 from that document mapped to the existing risk numbers in §2.

**Contract**: Append after the Phase 5 row:

```
| 6 | E2E infra hardening | Automated auth setup, env-based credentials, multi-browser config (Chrome + Firefox + Edge), E2E seeding helper | E3 (auth fragility), E5 (cross-browser) | E2E infra | not started | — |
| 7 | Onboarding pipeline E2E | Full chain: register → profile → dog → walking-area → dashboard → match list renders; error states at each step | E1 (pipeline breakage), E2 (empty matches after onboarding) | E2E | not started | — |
| 8 | Walking-area interaction E2E | Pin drag → save confirmation → reload persistence; radius adjust → save; error feedback on server-action failure | E4 (auto-save failure) | E2E | not started | — |
```

Note on risk mapping: The change.md defines E1-E5 risks specific to the E2E layer. These map to existing §2 risk numbers as follows:
- E1 (pipeline breakage) → Risk #1 (silent matching failure — proves full chain in browser)
- E2 (empty matches after onboarding) → Risk #1 (same risk, fresh-user angle)
- E3 (auth fragility) → Risk #4 (session expiry — infra prerequisite)
- E4 (auto-save failure) → new E2E-specific (server action reliability in browser)
- E5 (cross-browser) → cross-cutting (infrastructure)

### Success Criteria:

#### Automated Verification:

- §3 table has 8 rows (Phases 1-8)
- Phases 6-8 all show `not started` status

#### Manual Verification:

- Risk references in Phases 6-8 are consistent with §2 Risk Map numbering
- Column alignment and formatting match existing rows

---

## Phase 3: §3a Implementation Status Update

### Overview

Add Phases 6-8 to the "Not implemented" table so §3a remains the single status-of-the-world view.

### Changes Required:

#### 1. Three new rows in §3a "Not implemented" table

**File**: `context/foundation/test-plan.md`

**Intent**: List the E2E phases as pending work in the same format as existing Phases 2-5.

**Contract**: Append after the existing Phase 5 row in the "Not implemented" table:

```
| 6 | E3, E5 | Automated auth setup project (Playwright project dependency), env-based credentials, multi-browser config, E2E seed helper |
| 7 | E1, E2 | Full onboarding → match-list E2E: fresh user register through to rendered match cards |
| 8 | E4 | Walking-area pin drag/save/reload E2E with debounce wait strategy |
```

### Success Criteria:

#### Automated Verification:

- §3a "Not implemented" table has rows for Phases 6, 7, and 8

#### Manual Verification:

- Risk references use the E-prefixed notation consistent with change.md and the §3 "Risks covered" column

---

## Phase 4: §7 Negative Space + §8 Freshness

### Overview

Add "Leaflet pixel rendering" to §7 and stamp §8 with today's date.

### Changes Required:

#### 1. New entry in §7

**File**: `context/foundation/test-plan.md`

**Intent**: Make explicit that Leaflet pixel-level rendering is out of E2E scope (distinct from the existing "Leaflet map rendering" entry which covers the general principle — this adds the specific "pixel rendering" exclusion per Interview Q5 signal and reinforces it for E2E phases).

**Contract**: The existing §7 entry already says "Leaflet map rendering — trust the library; we test that pin data reaches the map component's props, not that the map draws correctly." This covers the concept. Two options depending on whether the existing entry is sufficient:

- If the existing wording already covers "pixel rendering" adequately: add a parenthetical to the existing entry: `(pixel rendering, tile loading, zoom animations)`
- If a separate entry is needed: add below the existing Leaflet entry: `- **Leaflet pixel rendering** — tile rasterization, marker icon rendering, and zoom/pan animations are non-deterministic across browsers and not meaningful E2E assertions. Pin data correctness is already tested at integration layer. (Source: Interview Q5; reinforced by E2E Phase 8 scoping.)`

Prefer extending the existing entry with a parenthetical — it avoids near-duplicate bullets.

#### 2. §8 Freshness Ledger date stamp

**File**: `context/foundation/test-plan.md`

**Intent**: Update the "Strategy last reviewed" and "Stack versions last verified" dates to today.

**Contract**: Change:
```
- Strategy (§1–§5) last reviewed: 2026-06-17
- Stack versions last verified: 2026-06-17
```
to:
```
- Strategy (§1–§5) last reviewed: 2026-06-24
- Stack versions last verified: 2026-06-24
```

### Success Criteria:

#### Automated Verification:

- §7 contains the text "pixel rendering"
- §8 contains `2026-06-24` for strategy and stack dates

#### Manual Verification:

- §7 entry reads naturally and doesn't duplicate the existing Leaflet entry

---

## Testing Strategy

### Automated:

- After all edits: `grep` for key strings in the updated file (Playwright 1.61.0, Phase 6/7/8, pixel rendering, 2026-06-24)

### Manual:

- Read §3, §3a, §4, §7, §8 in full to confirm formatting consistency and no broken table alignment

## References

- Research: `context/changes/test-plan-refresh-2026-06-24/research.md`
- Source spec: `context/changes/test-plan-refresh-2026-06-24/change.md`
- Target file: `context/foundation/test-plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: §4 Stack Correction

#### Automated

- [x] 1.1 §4 table contains `Playwright | 1.61.0` — 17f459b
- [x] 1.2 No "none yet" in E2E row — 17f459b

#### Manual

- [x] 1.3 Notes style consistent with other §4 rows — 17f459b

### Phase 2: §3 E2E Rollout Phases

#### Automated

- [x] 2.1 §3 table has 8 rows (Phases 1-8)
- [x] 2.2 Phases 6-8 show `not started` status

#### Manual

- [x] 2.3 Risk references consistent with §2
- [x] 2.4 Column alignment matches existing rows

### Phase 3: §3a Implementation Status Update

#### Automated

- [ ] 3.1 §3a "Not implemented" table has Phase 6, 7, 8 rows

#### Manual

- [ ] 3.2 Risk notation consistent with change.md

### Phase 4: §7 Negative Space + §8 Freshness

#### Automated

- [ ] 4.1 §7 contains "pixel rendering"
- [ ] 4.2 §8 contains `2026-06-24` for strategy and stack dates

#### Manual

- [ ] 4.3 §7 entry reads naturally without duplication
