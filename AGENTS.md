# Repository Guidelines

Astro 6 SSR application with React 19 islands, Tailwind 4, Supabase auth, and shadcn/ui — deployed to Cloudflare Workers. See @CLAUDE.md for detailed architecture and auth flow.

## Hard Rules

- Never use `"use client"` or other Next.js directives — this is Astro, not Next.
- Never concatenate Tailwind class strings manually. Use the `cn()` helper from `@/lib/utils`.
- Every new Supabase table must have RLS enabled with granular per-operation, per-role policies.
- Server-only secrets (`SUPABASE_URL`, `SUPABASE_KEY`) are declared in `astro.config.mjs` `env.schema` and accessed via `astro:env/server` — never expose them to client code.
- API route handlers export uppercase names (`GET`, `POST`) and validate input with zod.
- Never import `@/lib/supabase` from a React component — the Supabase client uses server-only secrets and will fail at runtime on Cloudflare Workers.

## Build & Development

- `npm run dev` — start dev server (Cloudflare workerd runtime)
- `npm run build` — production build
- `npm run lint` — ESLint with strict type-checked rules
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier

Run `npx astro sync` after changing the env schema or content collections.

## Project Structure

- `src/pages/` — Astro pages and `api/` route handlers
- `src/components/` — Astro components (static) and React components (interactive islands)
- `src/components/ui/` — shadcn/ui primitives ("new-york" style); add new ones with `npx shadcn@latest add <name>`
- `src/lib/` — utilities, Supabase client, services
- `src/layouts/` — page layouts
- `src/middleware.ts` — auth guard; add protected paths to `PROTECTED_ROUTES`
- `supabase/migrations/` — SQL migrations named `YYYYMMDDHHmmss_short_description.sql`

## Coding Conventions

- Import paths use `@/*` alias (maps to `./src/*`).
- Use Astro components for static content; reach for React only when client-side interactivity is required.
- Formatting enforced by Prettier — see @.prettierrc.json. Do not override settings per-file.
- Linting: strict type-checked rules — config at @eslint.config.js.
- Prefix unused variables with `_`.

## Commits & CI

- Conventional Commits format: `type: short description` (e.g. `feat:`, `fix:`, `chore:`).
- CI gate (GitHub Actions on push/PR to `master`): `npm ci` → `astro sync` → `lint` → `build`. Both lint and build must pass.
- Pre-commit hook runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Environment Setup

Node.js v22.14.0 (see `.nvmrc`). Copy `.env.example` to `.env` (Node) and `.dev.vars` (Cloudflare local dev). Local Supabase requires Docker — see @README.md for setup steps.
