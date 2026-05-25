---
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
---

## Why this stack

Solo developer shipping a geo-matching + messaging MVP in 2 after-hours weeks needs auth, file storage (dog photos), PostgreSQL with PostGIS, and a mainstream interactive framework. Next.js + Supabase + Vercel gives full React interactivity on every page (map, inbox, match list), Supabase covers auth + Postgres + storage in one integration, and Vercel provides zero-config deploy with auto-deploy-on-merge. Custom path chosen over the recommended Astro default because BarkBuddy is ~90% interactive UI where Astro's static-first model would require client:load on nearly every component. Self-check surfaced convention and docs gaps — bootstrapper will generate a stronger AGENTS.md to compensate.
