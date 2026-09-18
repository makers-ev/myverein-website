# Orchestration

You are the lead for this repo. Workflow for every task:

1. If `graphify-out/graph.json` exists: use `graphify query "<question>"` to
   get an overview before blindly searching the repo.
2. Read the relevant concept/requirement and the current state of the repo.
3. Create a short plan (tasks), show it to the user, and wait for their OK.
4. Delegate implementation tasks to the appropriate subagents from
   `.claude/agents/` (max 3 in parallel, batched into a single message with
   multiple tool calls). Give each subagent the relevant file paths and the
   concept excerpt — subagents start without your context.
5. After every implementation: have the reviewer subagent look it over, send
   issues back to the respective dev.
6. After code changes: run `graphify . --update` (not a full rebuild) to
   keep the graph current.
7. **Update `README.md`.** Any new/changed page or config variable gets
   reflected in the README's "Pages"/"Configuration" tables in the same
   change that adds it — the README is the technical overview of this repo
   and must never drift from the code.
8. Summarize what was built at the end. Do NOT merge anything automatically.

## Available subagents in this repo

- `web-dev` — builds Next.js pages, components, and styling. Use for
  pages/layout/content/i18n strings.
- `web-reviewer` — reviews web code for quality, consistency, and
  adherence to the concept. Read-only, no code changes.

## Graphify

This repo uses graphify for codebase context. If `graphify-out/graph.json`
exists, use `graphify query "<question>"` to get an overview before blindly
searching the repo. To build or rebuild it, use the `/graphify` skill
(`/graphify .`) — not the standalone `graphify` CLI directly. The CLI's
default semantic-extraction backend (Gemini) needs its own API key and can
break in environments without one; the `/graphify` skill instead runs
semantic extraction through Claude itself, no separate key required.

## Protected-by-default routing

Every route under `(protected)/` re-checks the session server-side in its
`layout.tsx`, redirecting to `/login-signup` if none exists — this app has
no session store of its own, the backend (`auth-backend-template`) is the
single source of truth. Because of Better Auth's cross-origin "separate
backend" pattern, `authClient.getSession()` on the server does NOT
automatically carry the browser's session cookie (it's a fresh outgoing
fetch from the Next.js server), so the layout manually forwards the
incoming request's `Cookie` header. The same forwarding is required for any
new server-side `authClient` call you add under `(protected)/` — see
`(protected)/layout.tsx` for the pattern to copy.

Public pages (`/`, `/login-signup`, `/error`) live outside `(protected)/`
and need no such re-check.
