# Bí Box — Claude Code Project Guide

## What this repository is

Bí Box (full product name: **Bí Box - Trợ lí phối đồ AI**) is a Vietnamese women's fashion knowledge and personal styling platform. The GitHub/Vercel slugs remain `bi-mac`.

Core product surfaces:
- editorial Home
- Wardrobe / fashion dictionary
- Style exploration
- AI Stylist
- My Closet / saved items and looks

The MVP is not an ecommerce product. Do not introduce cart, checkout, payment,
seller, marketplace, or purchasing flows unless the product scope is explicitly changed.

## Repository state

A Next.js application exists in the repository root. Milestone 0 (foundation —
App Router scaffold, editorial Home, Wardrobe, Styles, AI Stylist, My Closet,
Vitest coverage), Milestone 1 (the art-direction image batch — see
`docs/13_ART_DIRECTION.md` and
`docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md`), Milestone 2
(the catalog expansion to 15 items, 5 styles, and 10 outfits, with real
ranking metadata — occasions/fit/attributes — and cross-linked detail pages),
and Milestone 3 (the full AI Stylist — questionnaire, Gemini provider with a
deterministic fallback, catalog grounding/ranking, NDJSON streaming, rate
limiting) are all complete and deployed to production:

- Production: https://bi-mac.vercel.app
- Vercel project: `hoatien/bi-mac`

`/stylist` (AI Stylist) is **no longer** a copy-only shell: the questionnaire,
the photo-optional analyze/explain pipeline, and catalog-grounded results (with
a deterministic fallback when no API key is configured or the model errors/
times out) are all real and covered by tests, including an end-to-end
Playwright spec. See ADR-011, ADR-012, ADR-016, ADR-017, ADR-018 and
`docs/05_AI_STYLIST_SPEC.md`.

`/closet` (My Closet) is **no longer** a copy-only shell. Google OAuth via
Supabase Auth gates it: `src/app/(account)/` + `src/proxy.ts` are the route
boundary (ADR-021), and a signed-out or unconfigured visitor sees an inline
message, never a redirect. Signed in, `/closet/items` is a real personal
wardrobe — users photograph their own clothes, an AI tagger labels the photo
(Gemini primary, deterministic fallback with no key) into a pre-filled,
user-editable draft before it saves (ADR-027), and garment photos live in a
private Supabase Storage bucket served only via short-lived signed URLs
(ADR-028). `/closet/looks` and `/closet/styles` save Bí Mặc catalog
outfits/styles by slug (ADR-026). `/stylist` now reads the signed-in user's
own closet items and ranks them alongside the catalog, labelled separately in
the UI as the user's own wardrobe, not a Bí Mặc recommendation. Account
deletion (`/closet/account`) removes bucket files before the auth user row,
and fails closed if the bucket step fails (ADR-022). See ADR-021, ADR-022,
ADR-024 through ADR-029, and
`docs/superpowers/specs/2026-10-31-tu-do-ca-nhan-design.md`.

Editorial Stories are also unfinished, the same way: `src/data/fixtures/stories.ts`
has 3 fixture records, but each is title-only (`slug`/`title`/`excerpt`/`image` —
no article body, no `paragraphs` field on `Story`), there is no `/stories` or
`/stories/[slug]` route anywhere in `src/app/`, and `StoryCard` renders no
`Link`, which is why this is not a dead-link bug. Full story content (~1,800
words across 3 stories) and the `/stories/[slug]` route are explicitly out of
scope for this work and land in M4 — do not assume either exists.

Keep the command list below accurate as the toolchain lands.

## Commands

```bash
pnpm install                              # install
pnpm dev                                  # local dev server
pnpm build                                # production build
pnpm lint                                 # eslint
pnpm typecheck                            # runs `next typegen` first (pretypecheck), then tsc --noEmit
pnpm test                                 # vitest run
pnpm test:watch                           # vitest, watch mode
pnpm vitest run src/data/index.test.ts    # single test file
pnpm vitest run -t "trả về đúng item theo slug"  # single test by name
pnpm test:e2e                             # Playwright, critical browser flows
```

Running `pnpm dev` auto-appends a `<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
