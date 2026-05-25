---
project: BarkBuddy
deployed_at: 2026-05-25
platform: Vercel
production_url: https://bark-buddy-rose.vercel.app
vercel_project_id: prj_w2tQE9ERyTBkacuE8UoYAMNVpBPy
---

## What Was Deployed

First production deploy of BarkBuddy — a Next.js 16.2.6 scaffold (App Router, React 19, Tailwind CSS 4) on Vercel Hobby plan.

## Deploy Model

- **Platform**: Vercel (Hobby, $0)
- **Deploy trigger**: Auto-deploy on merge to `main` via Vercel GitHub Integration
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) — lint → test → build on push/PR to main
- **Test runner**: Vitest with React Testing Library (smoke test)

## Steps Executed

1. Installed Vitest + Testing Library, created `vitest.config.mts` and smoke test
2. Created GitHub Actions CI workflow (lint, test, build)
3. Installed Vercel CLI (v54.4.1), logged in, linked project
4. Fixed `package-lock.json` — had 528 references to private registry (`bahnhub.tech.rz.db.de`); created project `.npmrc` with `registry=https://registry.npmjs.org/` and regenerated lockfile
5. Deployed to production via `vercel --prod`

## Manual Steps Required (one-time)

- **Vercel GitHub Integration**: Connect repo `karolwasemann/bark-buddy` in Vercel dashboard → Settings → Git → Connect Git Repository. Production branch: `main`.
- **Required status checks**: In GitHub repo Settings → Branches → Branch protection rule for `main` → Require status checks → add `ci` job.

## Files Added/Modified

| File | Purpose |
|------|---------|
| `.npmrc` | Forces public npm registry for this project |
| `vitest.config.mts` | Vitest configuration (jsdom, react plugin, tsconfigPaths) |
| `src/__tests__/page.test.tsx` | Smoke test — home page renders |
| `.github/workflows/ci.yml` | CI pipeline: lint, test, build |
| `package.json` | Added `"test": "vitest run"` script + dev deps |
| `package-lock.json` | Regenerated against public registry |

## Secrets & Environment Variables

None configured yet. Supabase keys will be added when that integration is set up:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Rollback

```bash
vercel rollback
```

## Known Issues

- Vercel Hobby plan: 100 GB bandwidth cap — serve dog photos from Supabase Storage CDN directly, not through `next/image` proxy
- Server Actions body limit: 4.5 MB — use presigned URLs for photo uploads
