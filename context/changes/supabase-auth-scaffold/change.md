---
change_id: supabase-auth-scaffold
title: Supabase auth scaffold
status: impl_reviewed
created: 2026-05-27
updated: 2026-06-01
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

### 2026-06-01 — impl-review triage

Triaged 5 findings (full-plan review). Build + lint green after fixes.

- F2 (logout ignored signOut error) — FIXED.
- F4 (raw `<a>` for internal nav) — FIXED (`next/link`) + recorded as lesson.
- F5 (unsafe FormData casts) — FIXED (`?.toString() ?? ""`) + recorded as lesson.
- F3 (redundant getUser) — recorded as lesson; code left as MVP-acceptable.
- F1 (raw Supabase error messages → email enumeration) — SKIPPED; open follow-up before user-facing release.

Lessons captured in `context/foundation/lessons.md` (3 entries; Rule/Applies-to placeholders pending).
