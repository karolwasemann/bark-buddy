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

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 3

Review AI-generated code before merge with the **implementation review chain**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` is the lesson focus. Review is a quality gate, not an instruction to fix every finding.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code review (lesson focus)** | |
| `/10x-impl-review <change-id>` | You have implemented code and want a structured review before merge. The skill checks plan adherence, scope discipline, safety and quality, architecture, pattern consistency, and success criteria, then presents findings for triage. |
| **Recurring lesson outcome** | |
| `/10x-lesson` | A finding reveals a recurring project rule or agent failure pattern. Record it in `context/foundation/lessons.md` instead of treating it as a one-off note. |

### Triage discipline

- Severity says how bad the finding is. Impact says how much the decision matters now.
- Valid outcomes: fix now, fix differently, skip, accept as risk, record as recurring rule (`/10x-lesson`), disagree.
- Fix critical findings. Do not burn hours on low-impact observations just because the agent found them.
- Conscious skipping of low-impact findings is a valid review outcome, not negligence.
- If you disagree with a finding, record why. Wrong agent reasoning is also signal.

### Review boundaries

- This lesson reviews implemented code. It does not create the plan, execute new phases, or teach CI review.
- Testing strategy and quality gates are introduced in Module 3.
- Do not use `/10x-contract` as a triage outcome in this lesson.

### Paths used by this lesson

- `context/changes/<change-id>/plan.md` - expected implementation contract
- `context/changes/<change-id>/reviews/` - review output
- `context/foundation/lessons.md` - recurring lessons

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
