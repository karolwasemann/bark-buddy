---
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
---

## Why this stack

Solo developer shipping a dog-walking matchmaker MVP in 2 weeks after-hours with auth and image uploads as the two technology-forcing features. The 10x Astro Starter (Astro 6 + React 19 + TypeScript + Supabase + Cloudflare) is the recommended default for `(web-app, js)` and clears all four agent-friendly gates — typed, convention-based, popular in training data, and well-documented. Supabase covers auth (FR-001/002) and file storage (FR-011 dog photos) out of the box; Cloudflare Pages handles edge deploy with zero ops overhead matching the tight timeline. CI runs on GitHub Actions with auto-deploy-on-merge.
