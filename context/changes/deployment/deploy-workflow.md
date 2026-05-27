# BarkBuddy — Deploy Workflow

## Production URL

https://bark-buddy-rose.vercel.app

## How to Deploy

Push or merge to `main`. Vercel GitHub Integration auto-deploys to production within ~20s.

```bash
git push origin main
```

## How to Preview

Push to any non-main branch. Vercel creates a unique preview URL automatically.

```bash
git push origin feature/my-change
# → Preview at: bark-buddy-git-feature-my-change-karolwasemanns-projects.vercel.app
```

## How to Rollback

```bash
vercel rollback
```

Instantly promotes the previous production deployment. Database changes (when Supabase is added) do NOT roll back — only application code reverts.

## Region

Functions execute in **fra1** (Frankfurt) — configured in `vercel.json`. This minimizes latency for Polish users (~20ms vs ~120ms from US East).

## CI Quality Gate

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

1. `npm run lint` — ESLint
2. `npm test` — Vitest
3. `npm run build` — Next.js production build

CI is separate from Vercel's deploy. Both run in parallel. Branch protection (manual setup) blocks merges if CI fails.

## Known Limitations (Hobby Plan)

| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB/month |
| Serverless invocations | 1M/month |
| CPU hours | 4 hours/month |
| Function duration | 60s max |
| Preview deploys | Public by default |

Overages on Hobby return errors (no auto-scale). No alerting — monitor via Vercel dashboard.

## Branch Protection (Manual Setup)

Go to https://github.com/karolwasemann/bark-buddy/settings/branches:
1. Add rule for `main`
2. Require status checks: `ci`
3. Require branches to be up to date
