# Plan: Create GitHub Issues Mirroring BarkBuddy Roadmap

## Implementation Plan

**Problem Statement:**
Translate the 7 roadmap items (F-01, F-02, S-01–S-05) into GitHub Issues with full metadata (custom labels, milestones, dependency links) using the `gh` CLI, so the team has a trackable backlog that mirrors the roadmap structure.

**Requirements:**
- Platform: GitHub Issues via `gh` CLI
- Metadata: title, description (with acceptance criteria), custom labels, milestone, dependency references ("Blocked by #N"), assignee placeholder
- Custom labels matching roadmap taxonomy (stream, type, status)
- Milestones by stream (3 milestones)
- Dependency links between issues (explicit "Blocked by" references in body)
- Language: English throughout

**Proposed Solution:**
1. Create custom labels
2. Create 3 milestones (one per stream)
3. Create issues in dependency order (F-01 & F-02 first, then S-01→S-05), referencing earlier issue numbers in "Blocked by" lines

## Label Scheme

| Label | Color | Description |
|-------|-------|-------------|
| `type:foundation` | `#0E8A16` | Foundation/infrastructure work |
| `type:slice` | `#1D76DB` | User-facing feature slice |
| `stream-A` | `#D93F0B` | Core matching stream |
| `stream-B` | `#FBCA04` | Data & geo stream |
| `stream-C` | `#C5DEF5` | Profile maintenance stream |
| `status:ready` | `#0E8A16` | Ready for implementation |
| `status:proposed` | `#E4E669` | Proposed, not yet ready |

## Milestone Scheme

| Milestone | Description |
|-----------|-------------|
| Stream A: Core matching | F-01 → S-01 → S-02 → S-03 → S-04 |
| Stream B: Data & geo | F-02 |
| Stream C: Profile maintenance | S-05 |

## Issue Creation Order & Dependencies

| # | Roadmap ID | Title | Labels | Milestone | Blocked by |
|---|-----------|-------|--------|-----------|------------|
| 1 | F-01 | Implement Supabase Auth: register, login, logout, middleware | `type:foundation`, `stream-A`, `status:ready` | Stream A | — |
| 2 | F-02 | Design Postgres schema + geo-overlap matching function | `type:foundation`, `stream-B`, `status:ready` | Stream B | — |
| 3 | S-01 | User + dog profile creation with photo upload | `type:slice`, `stream-A`, `status:proposed` | Stream A | #1 |
| 4 | S-02 | Map view: place walking-area pin + set radius | `type:slice`, `stream-A`, `status:proposed` | Stream A | #3 |
| 5 | S-03 | Match list: geo-overlap query + privacy-safe display | `type:slice`, `stream-A`, `status:proposed` | Stream A | #2, #4 |
| 6 | S-04 | Walk invitation + accept/decline + free-text inbox | `type:slice`, `stream-A`, `status:proposed` | Stream A | #5 |
| 7 | S-05 | Edit display name + dog name | `type:slice`, `stream-C`, `status:proposed` | Stream C | #3 |
