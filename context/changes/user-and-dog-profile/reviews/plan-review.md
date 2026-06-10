<!-- PLAN-REVIEW-REPORT -->
# Plan Review: User and Dog Profile (Slice S-01)

- **Plan**: context/changes/user-and-dog-profile/plan.md
- **Mode**: Deep
- **Date**: 2026-06-10
- **Verdict**: REVISE
- **Findings**: 2 critical  2 warnings  1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | FAIL |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding
6/6 paths ✓ (supabase/ absent = expected, Phase 1 creates it), symbols ✓ (getUser guard, useActionState, ?.toString() ?? ""), brief↔plan ✓

## Findings

### F1 — Layout gate can't read the path; /profile/new exemption loops

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architectural Fitness
- **Location**: Phase 3 §1 (gate in protected layout) vs. Phase 2 §1 (page placement)
- **Detail**: The gate lives in src/app/(protected)/layout.tsx and must exempt /profile/new to avoid a loop. But App Router Server Component layouts have no access to the current pathname — there is no API for it, and I confirmed there is no middleware injecting an x-pathname header. So the layout cannot tell whether the request IS /profile/new. Meanwhile Phase 2 explicitly places the page UNDER (protected) ("Lives under (protected) so the auth guard applies"), so the gate runs for /profile/new and redirects to /profile/new → infinite redirect loop. The plan acknowledges the risk but defers it ("choose whichever keeps a single completeness query and no loop"), which contradicts Phase 2's committed placement and leaves the implementer to guess.
- **Fix A ⭐ Recommended**: Nested route group for gated routes
  - Strength: Idiomatic App Router; no pathname needed, no loop, one completeness query — exactly the plan's stated constraint.
  - Tradeoff: Restructures route folders (move two pages).
  - Confidence: HIGH — standard App Router pattern; verified no middleware to lean on.
  - Blind spot: None significant.
- **Fix B**: Middleware injects pathname; layout reads it via headers()
  - Strength: Keeps the current folder layout unchanged.
  - Tradeoff: New middleware + Supabase session refresh handling in the edge runtime; per-request header coupling is fragile.
  - Confidence: MED — works, but adds moving parts the slice otherwise avoids.
  - Blind spot: Supabase SSR session handling in middleware not yet present.
- **Decision**: FIXED (Fix A — nested (gated) route group; gate moved to (protected)/(gated)/layout.tsx, /profile/new stays outside it)

### F2 — Two-insert write isn't idempotent; partial failure bricks the user

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 §2 (createProfile) + Phase 3 §1 (gate keys on dogs)
- **Detail**: createProfile does insert profiles, then insert dogs (plain inserts, no transaction). On a dogs-insert failure it deletes the orphaned photo and returns an error — but leaves the profiles row in place. The gate keys on dogs existence, so the user is redirected back to /profile/new and re-submits. The second attempt's `insert profiles (id = auth.uid())` now hits a duplicate-key on the existing row and fails. With no edit flow in this slice (S-05, out of scope), that user is permanently stuck — can never complete onboarding, never leave the gate.
- **Fix**: Make the profiles write idempotent — upsert with onConflict: "id" (do nothing / update) instead of insert, so a retry after a partial failure succeeds. Confirm the RLS update path is covered.
- **Decision**: FIXED (upsert profiles onConflict "id"; flagged dependency on RLS UPDATE policy)

### F3 — next/image will throw on the signed Supabase URL (host not configured)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 §2 (profile view, render with next/image)
- **Detail**: Phase 3 renders the dog photo "via next/image" from a server-minted signed URL. next/image rejects any remote host not listed in images.remotePatterns. I confirmed next.config.ts is empty — no remote config — and no phase adds it. As written the profile view will throw at runtime ("hostname is not configured under images"). Separately, the optimizer caches the optimized asset, which can outlive the short signed-URL TTL and the privacy intent.
- **Fix A ⭐ Recommended**: Render the private photo with a plain <img>
  - Strength: No host allow-listing; the optimizer never caches a private asset, so signed-URL TTL stays meaningful. Smallest change.
  - Tradeoff: Loses Next image optimization for one image.
  - Confidence: HIGH — sidesteps both the config and the cache-vs-TTL issue.
  - Blind spot: None significant.
- **Fix B**: Add the Supabase storage host to images.remotePatterns
  - Strength: Keeps next/image optimization.
  - Tradeoff: Optimizer caches a private image; signed-URL TTL no longer bounds access to the optimized copy.
  - Confidence: MED — works for rendering but weakens the privacy story.
  - Blind spot: Cache-key/TTL interaction with rotating signed URLs unverified.
- **Decision**: FIXED (Fix A — render the signed-URL photo with a plain <img>, not next/image)

### F4 — Orphan cleanup only covers one path; abandonment/re-select still leak

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details + Phase 2 §1 (upload on select)
- **Detail**: The photo is uploaded client-side on file-selection (before submit) to <uid>/<uuid>.<ext>, and the plan states this design is "so abandoned uploads don't accumulate." But cleanup is wired only to the dogs-insert failure. Two paths still leak: (a) the user selects a photo and never submits (closes the tab) — no cleanup ever runs; (b) the user selects a second file — a new random uuid means the first object is orphaned. The design doesn't meet its own stated goal.
- **Fix**: Upload to a deterministic per-user path (e.g. <uid>/dog.<ext>) so a re-select overwrites rather than orphans, and/or upload on submit instead of on-select. True tab-close abandonment can't be fully solved client-side — call it out as a known residual.
- **Decision**: FIXED (deterministic <uid>/dog.<ext> path + upsert; prefix-cleanup on extension change; tab-close abandonment noted as accepted residual)

### F5 — RLS INSERT/UPDATE policies need WITH CHECK, only SELECT is shown

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §2/§3/§4 (RLS policies)
- **Detail**: The contracts say "select/insert/update only where id/owner_id = auth.uid()" but the only SQL example uses USING (a SELECT policy). INSERT policies use WITH CHECK and UPDATE needs both USING and WITH CHECK.
- **Fix**: Spell out `with check` for insert and `using` + `with check` for update in each table's policy block.
- **Decision**: SKIPPED