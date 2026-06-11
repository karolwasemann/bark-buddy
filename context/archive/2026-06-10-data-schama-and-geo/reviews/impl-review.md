<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: PostGIS & Geo-Overlap Matching Function

- **Plan**: context/changes/data-schama-and-geo/plan.md
- **Scope**: All phases (1-3)
- **Date**: 2026-06-10
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical · 2 warnings · 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Division-by-zero risk in overlap calculation

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260610092307_create_find_matches_function.sql:49-54
- **Detail**: LEAST(ST_Area(...), ST_Area(...)) can theoretically be zero (degenerate geometry at poles or radius_m=0, though CHECK constrains minimum to 200). Division by zero → runtime error.
- **Fix**: Wrap denominator with NULLIF(..., 0) so the row is excluded (NULL fails the >= 0.10 check) instead of crashing.
- **Decision**: FIXED

### F2 — No result LIMIT on find_matches()

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260610092307_create_find_matches_function.sql:56
- **Detail**: No LIMIT clause — in a dense area, a user could get hundreds of matches per call. Unbounded results can cause slow responses and high memory usage on the client.
- **Fix**: Add LIMIT 50 (or a parameter) after the ORDER BY.
- **Decision**: FIXED — added LIMIT 50

### F3 — dog_photo_path exposes private bucket path

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260610092307_create_find_matches_function.sql:12
- **Detail**: Plan explicitly includes dog_photo_path in return type. PRD says "dog photo visible only to matched users." The function correctly limits this to matched users only. However, the storage bucket RLS (owner-only) will independently block the download unless a separate policy is added for matched users — this is a future concern for the frontend integration change, not a bug here.
- **Decision**: ACCEPTED-AS-RULE: Storage RLS must align with function-level access

### F4 — STABLE marker not in plan (benign extra)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: supabase/migrations/20260610092307_create_find_matches_function.sql:15
- **Detail**: `stable` volatility marker was added but not specified in the plan. Correct optimization — tells Postgres the function doesn't modify data and can be cached within a transaction.
- **Decision**: SKIPPED — benign optimization, kept as-is
