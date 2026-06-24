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

## Response Style

When reporting information to me, be extremely concise and sacrifice grammer for the sake of concision.

**Going deeper:**
Only add advanced detail when the user asks for it (e.g. _"Can you explain more?"_ or _"How does X work under the hood?"_).

---

## Asset Creation Rules

Every file, snippet, or document you create must:

1. Have a **clear title** that says what it is
2. Start with a **1–2 sentence summary** of what it does
3. Use **comments** in code to explain non-obvious parts
4. Avoid unnecessary boilerplate or filler content

---

## Quick Checklist Before Every Response

- [ ] Is every sentence necessary?
- [ ] Would a junior dev understand this?
- [ ] Are titles and bullets used where helpful?
- [ ] Is it free of jargon (or are terms explained)?

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)

**For E2E tests, use the `/10x-e2e` skill.** It is the single source of truth
for the workflow — risk → seed test + rules → generate → review against the five
anti-patterns → re-prompt → verify. The skill's `references/` carry the full
rules, anti-patterns, seed pattern, and prompt-template.

A few hard rules that hold even before you invoke the skill:

- **Locators:** `getByRole` / `getByLabel` / `getByText` first; `getByTestId`
  only when accessibility attributes are ambiguous. Never CSS selectors, XPath,
  or DOM structure.
- **Never `page.waitForTimeout()`.** Wait for state: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Test independence + cleanup.** Each test runs standalone — its own setup,
  action, assertion, and cleanup; unique ids (timestamp suffix) so parallel runs
  and re-runs don't collide.

Two boundaries to keep straight:

- **DOM (snapshot) is the default.** Vision (`--caps=vision`) is a supplement for
  visual-only risks (layout, z-index, animation); for pixel regression prefer
  deterministic tools (`toMatchSnapshot`, Argos, Lost Pixel). VLM model
  selection/cost is a debugging topic (Lesson 5), not testing.
- **Healer helps on selectors, harms on logic.** A changed selector → healer
  re-finds it (route through PR review). A changed business behavior → healer
  masks the bug; that failing-test-to-fix case is Lesson 5.

<!-- END @przeprogramowani/10x-cli -->
