---
change_id: testing-critical-path-matching
title: Critical-path matching test coverage for risks #1, #2, #3
status: implementing
created: 2026-06-17
updated: 2026-06-17
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical-path matching".
Risks covered: #1 (silent matching failure), #2 (RLS blocks cross-user data), #3 (location privacy leak).
Test types planned: integration + contract.

Risk response intent:
- #1: Prove two overlapping users see each other in match list; prove non-overlapping users do NOT match; prove empty state renders when no matches exist.
- #2: Prove matched user can read another user's profile/dog/photo path; prove non-matched user CANNOT read that data via direct table query.
- #3: Prove API responses for match-list and match-detail exclude lat, lng, radius_m, and overlap percentage.

After creating the folder, follow the downstream continuation rule.
