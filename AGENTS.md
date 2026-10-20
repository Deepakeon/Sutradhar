# Agent Instructions

## Agent skills

### Issue tracker

GitHub issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

## Database Schema Architecture

All Postgres tables in this application must be created in the `private` schema (e.g. `private.profiles`, `private.interviews`, `private.interview_chunks`), NOT `public`. Direct PostgREST access to the `private` schema is revoked from `anon` and `authenticated` roles. Client and server read/write interactions must be mediated via explicit `SECURITY DEFINER` functions in the `public` schema (or via `service_role`). See `docs/adr/0001-private-schema-for-profiles.md`.

## Design System

All frontend/UI work must follow `DESIGN.md`. Consult it for color tokens, typography scale, component geometry, and spacing before writing or styling UI.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
