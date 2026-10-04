# Bí Mặc — Claude Code Starter Pack

This pack gives Claude Code the product context and repository-level steering needed
to build Bí Mặc incrementally without re-explaining the project every session.

## Why this pack is Claude-specific

Claude Code automatically reads a root `CLAUDE.md`. The pack keeps that file compact
and uses progressive disclosure:

- `CLAUDE.md` — persistent repo context and high-level conventions
- `.claude/rules/` — path-scoped constraints that load only when relevant files are touched
- `.claude/skills/` — reusable procedures for milestone implementation, verification,
  and UI review
- `docs/` — durable product, architecture, security, design, and roadmap references
- `docs/plans/` — lightweight plans for substantial milestones
- `PROMPT_INIT_CLAUDE.md` — first task to paste into Claude Code

## Install into a new repo

Copy the contents of this folder into the repository root.

Then:

```bash
cd <your-repo>
claude
```

Do not run `/init` if it would overwrite the curated `CLAUDE.md`. If you want Claude
to inspect the repository, ask it to do so directly.

Paste the task from `PROMPT_INIT_CLAUDE.md`.

## Recommended workflow

Use one milestone per focused Claude Code session when practical:

1. Foundation
2. Fashion knowledge graph / Wardrobe / Styles / Outfits
3. Supabase Auth + My Closet
4. AI Stylist
5. Editorial content/admin workflow
6. Production polish

For substantial work, ask Claude to use the `implementing-milestone` skill.
Before completion, invoke or ask it to use `verifying-changes`.
For major UI work, use `reviewing-ui`.

## Context discipline

Do not tell Claude to read every project document for every small task. The root
`CLAUDE.md` acts as an index, while `.claude/rules` and `.claude/skills` load more
specialized guidance only when relevant.

## Files shared with the Codex starter

The `docs/00_...` through `docs/12_...` product documents intentionally match the
Codex starter pack so either coding agent can work from the same product source of truth.
