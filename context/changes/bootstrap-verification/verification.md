---
bootstrapped_at: 2026-05-24T12:49:25Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: bark-buddy
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: bark-buddy
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Solo developer shipping a dog-walking matchmaker MVP in 2 weeks after-hours with auth and image uploads as the two technology-forcing features. The 10x Astro Starter (Astro 6 + React 19 + TypeScript + Supabase + Cloudflare) is the recommended default for `(web-app, js)` and clears all four agent-friendly gates — typed, convention-based, popular in training data, and well-documented. Supabase covers auth (FR-001/002) and file storage (FR-011 dog photos) out of the box; Cloudflare Pages handles edge deploy with zero ops overhead matching the tight timeline. CI runs on GitHub Actions with auto-deploy-on-merge.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | not run | — | cmd_template uses git clone; no npm CLI package to check |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-05-17 | fresh | from card.docs_url |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently (cwd had none)
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0

#### HIGH findings

- **devalue** v5.6.3–5.8.0 — DoS via sparse array deserialization (GHSA-77vg-94rm-hx3p, CVSS 7.5). Transitive. Fix available.

#### MODERATE findings

- **ws** v8.0.0–8.20.0 — Uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx, CVSS 4.4). Transitive via miniflare, @supabase/realtime-js. Fix available.
- **yaml** v2.0.0–2.8.2 — Stack overflow via deeply nested YAML collections (GHSA-48c2-rrv3-qjmp, CVSS 4.3). Transitive via yaml-language-server → volar-service-yaml → @astrojs/language-server → @astrojs/check. Fix requires semver-major bump of @astrojs/check.
- **miniflare** — moderate via ws. Transitive. Fix available.
- **wrangler** — moderate via miniflare. Direct. Fix available.
- **@cloudflare/vite-plugin** — moderate via miniflare, wrangler, ws. Transitive. Fix available.
- **@astrojs/check** — moderate via @astrojs/language-server → volar-service-yaml → yaml. Direct. Fix requires semver-major downgrade to 0.9.2.
- **@astrojs/language-server** — moderate via volar-service-yaml. Transitive. Fix requires @astrojs/check downgrade.
- **volar-service-yaml** — moderate via yaml-language-server. Transitive. Fix requires @astrojs/check downgrade.
- **yaml-language-server** — moderate via yaml. Transitive. Fix requires @astrojs/check downgrade.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | first-class |
| quality_override | false |
| path_taken | standard |
| self_check_answers | null |
| team_size | solo |
| deployment_target | cloudflare-pages |
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
