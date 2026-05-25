# Repository Guidelines

Next.js 16 application (React 19, TypeScript 5, Tailwind CSS 4) using the App Router. Bootstrapped with `create-next-app`.

## Hard Rules

- **Next.js 16 has breaking changes.** APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.
- Do not introduce a Pages Router (`pages/` directory). This project uses App Router exclusively.
- Do not add CSS Modules or styled-components. Use Tailwind utility classes for all styling.

## Build & Development Commands

- `npm run dev` — start the development server (hot reload on http://localhost:3000)
- `npm run build` — production build; must pass before any PR is considered complete
- `npm run lint` — run ESLint with next/core-web-vitals and next/typescript rulesets

No test framework is configured yet. Skip test commands until one is added.

## Project Structure

- `src/app/` — App Router pages and layouts (file-based routing: `page.tsx`, `layout.tsx`)
- `src/app/globals.css` — global Tailwind imports
- `public/` — static assets served at `/`

Import paths use the `@/*` alias mapped to `./src/*` (see @tsconfig.json `paths`).

## Coding Style & Naming

- TypeScript strict mode — no implicit `any`, no unchecked index access; enforced by `strict: true` in @tsconfig.json.
- React components: named exports in PascalCase `.tsx` files.
- Lint rules enforced: accessibility (jsx-a11y via core-web-vitals), React hooks rules, import resolution, and TypeScript type-checking. Run `npm run lint` to verify.
- Style with Tailwind 4 utility classes directly in JSX `className`. No `@apply` unless extracting a repeated multi-class pattern.

## Commit & PR Guidelines

Observed convention: Conventional Commits — `<type>: <description>` (e.g. `chore: migrate from Astro to Next.js framework`). Use lowercase type prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`.

No CI pipeline is configured. Verify locally with `npm run build && npm run lint` before pushing.
