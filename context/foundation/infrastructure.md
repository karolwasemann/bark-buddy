---
project: BarkBuddy
researched_at: 2026-05-27
recommended_platform: Vercel
runner_up: Railway
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Next.js 16
  runtime: Node.js
---

## Recommendation

**Deploy on Vercel.**

Vercel is the native hosting platform for Next.js 16, offering zero-configuration deployment, instant rollbacks, and the best developer experience for the exact stack in use (Next.js 16.2.6 + React 19). For a solo developer shipping an MVP in 2 after-hours weeks with low QPS and single-region traffic, Vercel's Hobby tier provides everything needed at zero cost — including preview deploys per PR, a full CLI for agent-driven operations, and machine-readable docs. The WebSocket limitation is accepted as a known trade-off: v2 live chat will use Supabase Realtime (client-side subscriptions) which works on Vercel without server-side persistent connections.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Vercel** | Pass | Pass | Pass | Pass | Partial (beta MCP) | 4.5 / 5 |
| **Railway** | Pass | Pass | Pass | Pass | Pass | 5 / 5 |
| **Render** | Pass | Pass | Pass | Pass | Pass | 5 / 5 |
| **Cloudflare** | Pass | Pass | Pass | Pass | Pass | 5 / 5 |
| **Netlify** | Partial | Pass | Pass | Partial | Pass | 4 / 5 |
| **Fly.io** | Pass | Partial | Partial | Pass | Fail | 3.5 / 5 |

**Notes:**

- **Vercel**: Native Next.js host. CLI covers deploy, rollback, and log streaming. `llms-full.txt` endpoint for agent consumption. MCP server exists but is in public beta. No WebSocket support — accepted trade-off for MVP.
- **Railway**: Full container PaaS with WebSocket support, GA MCP server (remote + local), `llms-full.txt` docs. Requires explicit Node 22 configuration for Next.js 16. ~$10/mo estimated cost.
- **Render**: Similar profile to Railway. Free tier available (with cold starts). GA MCP server, `llms.txt` docs. WebSocket native. No built-in edge CDN for static assets.
- **Cloudflare**: Excellent agent tooling and free tier. However, the Next.js 16 adapter (`@opennextjs/cloudflare`) is still maturing — the old `@cloudflare/next-on-pages` was archived Sep 2025. Adds adapter complexity for a 2-week MVP timeline.
- **Netlify**: No CLI rollback command. No WebSocket support. Credit-based pricing model adds unpredictability. Next.js 16 support is GA via OpenNext adapter.
- **Fly.io**: Requires Dockerfile authoring. No official MCP server. No `llms.txt`. No free tier (removed July 2024). Best for persistent-process workloads, overkill for this MVP.

### Shortlisted Platforms

#### 1. Vercel (Recommended)

Zero-config deploy for Next.js 16.2.6. The framework and platform are co-developed — App Router, Server Actions, ISR, and `next/image` optimization work out of the box. Hobby plan covers MVP traffic at $0/mo. CLI (`vercel`, `vercel rollback`, `vercel logs`) is fully scriptable. Preview deploys per Git branch are automatic. The only gap is the beta MCP server and the permanent WebSocket limitation.

#### 2. Railway

Full-stack container PaaS that runs Next.js as a standard Node.js process. Native WebSocket support makes it future-proof for live chat. GA MCP server (launched April 2026) enables structured agent access. `llms-full.txt` docs endpoint. Trade-off vs. Vercel: requires explicit Node version config, no automatic preview deploys per PR, and costs ~$10/mo from day one.

#### 3. Render

Similar to Railway with a free Hobby tier (750 instance-hours/month, cold starts after 15min idle). WebSocket native. GA MCP server and `llms.txt` docs. Trade-off vs. Vercel: no built-in image optimization CDN, no native ISR cache sharing, and cold starts on free tier hurt the "< 1s response time" NFR during idle periods.

## Anti-Bias Cross-Check: Vercel

### Devil's Advocate — Weaknesses

1. **WebSocket dead-end**: Vercel serverless functions fundamentally cannot hold persistent connections. When live chat arrives in v2, you'll need a separate service (Supabase Realtime client-side, or an external WebSocket provider), splitting the architecture across providers.
2. **Vendor lock-in via Next.js coupling**: Features like `next/image` optimization, ISR cache, and middleware are tuned for Vercel's infrastructure. Migration away requires re-implementing caching and image optimization.
3. **Hobby plan silent failures**: The free tier caps at 100GB bandwidth, 1M invocations, and 4 CPU-hours/month. Overages on Hobby don't auto-scale — the app returns errors. No alerting on Hobby plan.
4. **No persistent compute for background jobs**: If batch-computing matches or sending digest emails is needed later, Vercel has no cron/worker primitive beyond short-lived functions (10s default, 60s max on Hobby).
5. **MCP server is beta**: Schema and capabilities may change without notice, potentially breaking agent workflows.

### Pre-Mortem — How This Could Fail

The solo developer deployed BarkBuddy on Vercel's Hobby plan in week one — zero-config, instant preview URLs, everything worked beautifully. By month two, the app had 200 users in Warsaw. The match-list API route doing PostGIS circle-intersection queries via Supabase occasionally took 3-4 seconds under cold starts. Users saw spinners. The developer tried to add Supabase Realtime for live chat notifications in month three — only to discover that while client-side Realtime subscriptions work, any server-side WebSocket relay is impossible on Vercel. They spun up a separate service for the relay, but now auth tokens needed to flow between two platforms, CORS headers multiplied, and the deployment story went from "git push" to coordinating two platforms with different secrets stores. By month five, the Hobby plan's 4 CPU-hours were exhausted mid-month from SSR-heavy match pages. The app returned 502s for three days before the developer noticed. The "zero-config" promise had become a multi-platform, manually-coordinated mess.

### Unknown Unknowns

- **Vercel's Hobby plan has no SLA and no uptime guarantee** — a multi-hour platform incident during the 14-day validation window could kill the experiment with no recourse.
- **Function regions default to `iad1` (US East)** — for Polish users, you must explicitly set `"regions": ["fra1"]` in `vercel.json`, or every SSR request adds ~120ms of transatlantic latency. This is not surfaced during initial setup.
- **Preview deployments are publicly accessible by default** — anyone with the URL can see your staging app. For an app handling user location data, this is a privacy risk. Protecting previews requires Vercel Authentication (Pro plan, $20/mo).
- **`next/image` uses a Vercel-specific optimization service** — if you later migrate, all `<Image>` components need a new loader, and cached optimized URLs break.
- **13 CVEs published for Next.js 16 in May 2026** — Vercel does not auto-patch your framework version. You're responsible for updating `next` in `package.json` and redeploying.

## Operational Story

- **Preview deploys**: Every Git push to a non-production branch automatically creates a unique preview URL (e.g., `bark-buddy-git-feature-x.vercel.app`). No configuration needed. Preview URLs are public by default — protect sensitive previews with Vercel Authentication (Pro plan) or avoid committing real user data to preview environments.
- **Secrets**: Environment variables are stored in Vercel's project settings (dashboard or `vercel env add` CLI). Scoped per environment (Production / Preview / Development). Only team members with project access can read them. Rotation: update via CLI or dashboard, redeploy to pick up changes.
- **Rollback**: `vercel rollback` instantly promotes the previous production deployment. Time-to-revert: seconds. Caveat: database migrations (Supabase) do not roll back automatically — only the application code reverts.
- **Approval**: Human-required actions: publish to production domain (automatic on merge to main, but can be gated with branch protection), rotate Supabase service key, delete project. Agent-safe actions: deploy previews, read logs, list deployments, set non-secret env vars.
- **Logs**: `vercel logs <deployment-url>` streams runtime logs. `vercel logs <deployment-url> --follow` for live tailing. Build logs visible via `vercel inspect <deployment-url>`. All read-only, no mutation risk.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| WebSocket needed in v2 forces multi-platform architecture | Devil's advocate | H | M | Use Supabase Realtime client-side subscriptions (no server relay needed). If server-side WS required, migrate to Railway at that point. |
| Hobby plan CPU-hours exhausted under moderate traffic | Pre-mortem | M | H | Monitor usage via Vercel dashboard. Upgrade to Pro ($20/mo) when approaching 4 CPU-hr limit. Optimize SSR with caching. |
| Function cold starts cause >1s response times (NFR violation) | Pre-mortem | M | M | Enable Fluid Compute in `vercel.json` (`"fluid": true`). Keep functions warm with cron pings if needed. |
| Default US East region adds 120ms latency for Polish users | Unknown unknowns | H | M | Set `"regions": ["fra1"]` in `vercel.json` before first deploy. |
| Preview deploys expose location data publicly | Unknown unknowns | M | H | Never seed real user location data in preview environments. Use synthetic test data only. |
| Next.js 16 CVEs (May 2026 batch) unpatched | Unknown unknowns | M | H | Pin to latest patch (`16.2.6`), monitor Next.js security advisories, redeploy on patch releases. |
| Vendor lock-in makes future migration expensive | Devil's advocate | L | M | Avoid Vercel-only features where possible (use standard `next/image` with generic loader config). Keep Supabase as the data layer — it's portable. |
| MCP server beta breaks agent workflows | Research finding | L | L | Fall back to CLI (`vercel` commands) for all critical operations. MCP is a convenience, not a dependency. |

## Getting Started

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Configure function region for Poland**: Create `vercel.json` in project root:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "regions": ["fra1"]
   }
   ```
3. **Link project**: Run `vercel` in the project directory. Follow prompts to connect to your Vercel account and create the project.
4. **Set environment variables**: `vercel env add NEXT_PUBLIC_SUPABASE_URL` (repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY` and any server-side keys). Scope to Production + Preview + Development.
5. **Deploy to production**: Push to `main` branch (auto-deploys if Git integration is connected), or run `vercel --prod` from CLI.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
