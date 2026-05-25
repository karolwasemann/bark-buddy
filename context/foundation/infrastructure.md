---
project: BarkBuddy
researched_at: 2026-05-25
recommended_platform: Vercel
runner_up: Cloudflare Workers + Pages
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Next.js 16
  runtime: Node.js
---

## Recommendation

**Deploy on Vercel.**

Vercel is the native platform for Next.js 16 — zero-config deployment, first-class Supabase Marketplace integration (auto-injected env vars), and a Hobby plan that covers 1M serverless invocations/month at $0. The cost-minimization constraint is fully satisfied, and the lack of native WebSocket support is mitigated by Supabase Realtime handling live chat directly from the browser in v2 — no platform migration required.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP/Integration | Total |
|---|---|---|---|---|---|---|
| **Vercel** | Pass | Pass | Pass | Pass | Partial (MCP beta) | 4.5 |
| **Cloudflare** | Pass | Pass | Pass | Pass | Pass (MCP GA) | 5 |
| **Netlify** | Pass | Pass | Pass | Pass | Pass (MCP GA) | 5 |
| **Render** | Pass | Pass | Pass | Pass | Pass (MCP GA) | 5 |
| **Railway** | Pass | Pass | Pass | Pass | Pass (MCP GA) | 5 |
| **Fly.io** | Pass | Partial (Dockerfile) | Partial (no llms.txt) | Pass | Fail (no MCP) | 3.5 |

**Post-filter adjustments:** Cloudflare penalized for beta Next.js adapter (1.0.0-beta — unacceptable risk on 2-week timeline). Railway and Fly.io penalized for no free tier ($5-10/mo minimum). Render free tier penalized for 30-60s cold starts (violates PRD's <1s response requirement). Netlify lacks WebSocket support with no mitigation path for v2.

### Shortlisted Platforms

#### 1. Vercel (Recommended)

Native Next.js platform with zero-config deploy. Hobby plan ($0) covers 1M invocations, 100 GB bandwidth, and 6000 build minutes — more than sufficient for 1,000 users. First-class Supabase integration via Marketplace. Instant rollbacks, preview deploys per PR, and a stable CLI. The WebSocket gap is fully covered by Supabase Realtime (browser → Supabase direct connection, Vercel not in the path). MCP server exists in beta.

#### 2. Cloudflare Workers + Pages

Scored highest on raw criteria (5/5) with GA MCP server, excellent free tier (100k requests/day), and native WebSocket support via Durable Objects. Dropped from #1 because the `@opennextjs/cloudflare` adapter is beta (1.0.0-beta) — Node.js Middleware unsupported, Worker size limits (3 MiB on Free), and potential runtime compatibility issues with Supabase client libraries. Best long-term option once the adapter reaches GA.

#### 3. Netlify

GA Next.js 16 support via OpenNext adapter, generous credit-based free tier (300 credits/mo covers 100k requests), GA MCP server, and solid CLI. Lacks WebSocket support entirely with no mitigation path — Supabase Realtime works here too (same browser-direct pattern), but Netlify offers no advantage over Vercel for this stack while having a less mature Next.js integration.

## Anti-Bias Cross-Check: Vercel

### Devil's Advocate — Weaknesses

1. **No WebSocket support — ever.** When v2 requires live chat, you must use Supabase Realtime (browser-direct) or another external service. If a future feature requires server-initiated push that doesn't fit Supabase's Postgres Changes pattern, you'll need to bolt on Pusher/Ably ($) or migrate.
2. **Vendor lock-in via Next.js-specific optimizations.** Fluid Compute, ISR caching, and image optimization work differently on other platforms. Migration cost grows with each Vercel-specific feature adopted.
3. **Hobby plan hard limits with no overage.** 100 GB bandwidth cap. Dog photo uploads (each ~2MB, served to all matches) could push toward this limit. The jump from $0 to Pro ($20/mo/user) has no middle ground.
4. **Serverless cold starts under load spikes.** First request to a cold function adds 200-500ms. Geo-matching query round-trip (cold start + Supabase connection + PostGIS) could approach the PRD's 1s response budget.
5. **Build instability on Hobby plan.** May 2026 community reports of intermittent build failures at "Applying modifyConfig" step — transient but time-costly during a 2-week sprint.

### Pre-Mortem — How This Could Fail

The developer deployed on Vercel's Hobby plan in week one — zero-config, instant previews, Supabase env vars auto-injected. By week three, early users loved matching but complained the inbox felt dead — messages sat unread for days. Adding "user is online" presence indicators required real-time state that Supabase Realtime's Postgres Changes couldn't model cleanly (presence needs ephemeral state, not DB rows). They evaluated Supabase Presence (channel-based) but the client-side subscription model created race conditions with Server Components that expected server-rendered state. Meanwhile, dog photo uploads pushed bandwidth toward 100 GB. Forced to choose between $20/mo Pro or degraded image quality, the "free" promise eroded. The developer wished they'd budgeted $7/mo for Render from day one and had a normal Node.js process where adding a WebSocket endpoint was a single file change.

### Unknown Unknowns

- **Supabase Storage bandwidth counts against Vercel's 100 GB limit** if images are proxied through `next/image` optimization. Configure `remotePatterns` and serve directly from Supabase's CDN to avoid this.
- **Hobby plan has no team collaboration** — a co-founder or contractor cannot access the dashboard or deploy without upgrading to Pro ($20/mo per seat).
- **Vercel's Supabase Marketplace integration auto-provisions a new Supabase project** — if you already configured one separately, you'll get duplicate projects and env var conflicts. Link the existing project manually instead.
- **Server Actions have a 4.5 MB request body limit on Hobby.** Dog photo uploads via Server Actions will fail for high-res images — use Supabase Storage presigned URLs for direct upload instead.
- **Vercel Analytics and Speed Insights are paid add-ons** ($10/mo each). The free tier gives deploy logs but no runtime performance monitoring — you'll need a third-party APM or fly blind on user-facing latency.

## Operational Story

- **Preview deploys**: Every push to a non-production branch gets an automatic preview URL (e.g. `bark-buddy-git-feature-x-username.vercel.app`). Protected by default — only accessible via the unique URL. Fork PRs from external contributors also get previews.
- **Secrets**: Environment variables stored in Vercel's project settings (encrypted at rest). Scoped per environment (Production / Preview / Development). Supabase keys auto-injected if using Marketplace integration. Rotation: update in dashboard or `vercel env rm` + `vercel env add`, then redeploy.
- **Rollback**: `vercel rollback` — instant revert to the previous production deployment (< 5 seconds). Does not roll back database migrations — Supabase schema changes are independent.
- **Approval**: Human-required: publish to production (unless auto-deploy-on-merge is enabled), rotate secrets, delete project, upgrade plan. Agent-safe: preview deploys, log reading, env var listing.
- **Logs**: `vercel logs <deployment-url> --follow` for runtime request logs. Build logs visible via `vercel inspect <deployment-url>`. MCP server (beta) also exposes log queries.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Bandwidth cap hit from dog photo serving | Devil's advocate | M | M | Serve images directly from Supabase Storage CDN, not through `next/image` proxy |
| Cold start latency on geo-matching queries | Devil's advocate | M | L | Fluid Compute keeps functions warm; Supabase connection pooling (Supavisor) reduces connection overhead |
| Hobby→Pro cost jump with no middle tier | Devil's advocate | L | M | Monitor bandwidth via Vercel dashboard; optimize image sizes before upload; defer to Pro only if validated |
| Supabase Presence complexity for v2 online status | Pre-mortem | M | M | Design chat as message-insert + Realtime subscription (Postgres Changes); defer presence indicators to v2.1 |
| Server Action body limit blocks photo upload | Unknown unknowns | H | M | Use Supabase Storage presigned URLs for direct browser→storage upload from day one |
| Duplicate Supabase project from Marketplace auto-provision | Unknown unknowns | M | L | Link existing Supabase project manually via env vars; skip Marketplace auto-provision |
| Intermittent build failures on Hobby plan | Research finding | L | L | Retry deploy; if persistent, clear build cache via `vercel --force` |

## Getting Started

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Link project**: `vercel link` (select your Vercel account and create a new project)
3. **Set Supabase env vars**: `vercel env add NEXT_PUBLIC_SUPABASE_URL` and `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY` (paste values from your Supabase project settings)
4. **Deploy to production**: `vercel --prod` (zero config — detects Next.js 16 automatically, runs `next build`, deploys)
5. **Verify**: Open the production URL printed by the CLI. Confirm the app loads and Supabase connection works.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
