---
bootstrapped_at: 2026-05-25T10:40:00+02:00
starter_id: next
starter_name: "Next.js"
project_name: bark-buddy
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: next
package_manager: npm
project_name: bark-buddy
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: false
    docs_current: false
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Solo developer shipping a geo-matching + messaging MVP in 2 after-hours weeks needs auth, file storage (dog photos), PostgreSQL with PostGIS, and a mainstream interactive framework. Next.js + Supabase + Vercel gives full React interactivity on every page (map, inbox, match list), Supabase covers auth + Postgres + storage in one integration, and Vercel provides zero-config deploy with auto-deploy-on-merge. Custom path chosen over the recommended Astro default because BarkBuddy is ~90% interactive UI where Astro's static-first model would require client:load on nearly every component. Self-check surfaced convention and docs gaps — bootstrapper will generate a stronger AGENTS.md to compensate.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | create-next-app v16.2.6 published 2026-05-23 | fresh | resolved from cmd_template |
| GitHub repo | not run | — | gh CLI not installed; docs_url (nextjs.org/docs) is not a direct GitHub repo URL |

## Scaffold log

**Resolved invocation**: `npx create-next-app@latest bootstrap-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 14 (src/, public/, node_modules/, .next/, .gitignore, package.json, package-lock.json, tsconfig.json, next.config.ts, eslint.config.mjs, postcss.config.mjs, README.md, AGENTS.md, CLAUDE.md, next-env.d.ts)
**Conflicts (.scaffold siblings)**: none (prior scaffold removed per user request)
**.gitignore handling**: moved silently (no prior .gitignore in cwd)
**bootstrap-scaffold cleanup**: deleted

**Note**: `.bootstrap-scaffold` (with leading dot) was rejected by create-next-app due to npm naming restrictions. Used `bootstrap-scaffold` instead.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 0 HIGH, 2 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/1/0 direct of total 0/0/2/0

#### MODERATE findings

1. **postcss** < 8.5.10
   - Advisory: GHSA-qx2v-qp2m-jg93
   - Title: PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output
   - CVSS: 6.1 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)
   - Path: node_modules/next/node_modules/postcss (transitive via next)
   - Fix: postcss >= 8.5.10 (requires next update beyond current range)

2. **next** 9.3.4-canary.0 – 16.3.0-canary.5
   - Via: postcss (above)
   - Path: node_modules/next (direct dependency)
   - Fix: next < 9.3.4-canary.0 (semver-major downgrade — not practical; wait for next patch)

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | verified |
| quality_override | false |
| path_taken | custom |
| self_check_answers | typed: true, from_official_starter: true, conventions: false, docs_current: false, can_judge_agent: false |
| team_size | solo |
| deployment_target | vercel |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | true |
| has_payments | false |
| has_realtime | false |
| has_ai | false |
| has_background_jobs | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
