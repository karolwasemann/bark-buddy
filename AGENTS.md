# Repository Guidelines

Next.js 16 application (React 19, TypeScript 5, Tailwind CSS 4) using the App Router. Bootstrapped with `create-next-app`.

## Hard Rules

- **Next.js 16 has breaking changes.** APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.
- Do not introduce a Pages Router (`pages/` directory). This project uses App Router exclusively.
- Do not add CSS Modules or styled-components. Use Tailwind utility classes for all styling.

## Build & Development

See @package.json `scripts` and @README.md. `npm run build` must pass before any PR is considered complete. No test framework yet — skip test commands until one is added.

## Coding Style & Naming

- React components: named exports in PascalCase `.tsx` files.
- Style with Tailwind 4 utility classes directly in JSX `className`. No `@apply` unless extracting a repeated multi-class pattern.
- Lint & type rules: see @tsconfig.json (`strict: true`) and @eslint.config.mjs. Run `npm run lint` to verify.

## Commit & PR Guidelines

Observed convention: Conventional Commits — `<type>: <description>` (e.g. `chore: migrate from Astro to Next.js framework`). Use lowercase type prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`.

No CI pipeline is configured. Verify locally with `npm run build && npm run lint` before pushing.
