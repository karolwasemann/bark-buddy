---
change_id: ci-cd-test
title: Ci cd test
status: implemented
created: 2026-06-24
updated: 2026-06-24
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

### Required GitHub Repository Secrets

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL (integration tests + build via NEXT_PUBLIC_SUPABASE_URL) |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (integration tests + build via NEXT_PUBLIC_SUPABASE_ANON_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (integration tests — bypasses RLS) |
| `SUPABASE_TEST_EMAIL` | Test account email (e2e auth setup) |
| `SUPABASE_TEST_PASSWORD` | Test account password (e2e auth setup) |

### Branch Protection

GitHub → Settings → Branches → Add rule for `main`:
- Require status checks to pass: `quality`, `test`, `e2e`
- Optionally: require branches to be up to date before merging
