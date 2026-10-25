# Bí Mặc — Claude Code Project Guide

## What this repository is

Bí Mặc is a Vietnamese women's fashion knowledge and personal styling platform.

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
(the catalog expansion to 15 items / 5 styles / 10 outfits / 3 stories), and
Milestone 3 (the full AI Stylist — questionnaire, Gemini provider with a
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

`/closet` (My Closet) is **still** a copy-only shell: it renders real layout
and copy, but there is no save action and no persistence (no `localStorage`,
no Supabase) anywhere in `src/`. That behaviour is scoped to a later
milestone (M4) — do not assume it exists.

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

The app must boot and pass these without Supabase credentials or a paid AI key.
`GOOGLE_GENERATIVE_AI_API_KEY` is optional: when it is absent (or the Gemini
call errors/times out/is rate-limited), the AI Stylist runs entirely on its
deterministic fallback provider and reports that in its response — see
ADR-011 and ADR-018.

## Source of truth

Use the files in `docs/` for product and architecture details.

Read only the documents relevant to the task instead of loading all docs by default.
Start with:
- `docs/00_PROJECT_CONTEXT.md` for product context
- `docs/01_PRD.md` for MVP requirements
- `docs/09_MVP_ROADMAP.md` and `docs/12_TASK_BACKLOG.md` for sequencing

Then open the specialized document needed by the task:
- information architecture → `docs/02_INFORMATION_ARCHITECTURE.md`
- technical architecture → `docs/03_TECH_ARCHITECTURE.md`
- database/data model → `docs/04_DATA_MODEL.md`
- AI Stylist → `docs/05_AI_STYLIST_SPEC.md`
- visual/UI work → `docs/06_DESIGN_SYSTEM.md`
- auth/storage/security → `docs/07_SECURITY_PRIVACY.md`
- seed/demo data → `docs/08_SEED_CONTENT.md`
- acceptance criteria → `docs/10_ACCEPTANCE_CRITERIA.md`
- architectural decisions → `docs/11_DECISIONS.md`

## Baseline stack

Unless the existing repository already contains a compatible equivalent:
- Next.js App Router
- TypeScript, strict mode
- Tailwind CSS
- shadcn/ui only where useful and visually customized
- pnpm
- PostgreSQL / Supabase-compatible data layer
- Supabase Auth and private Storage architecture
- Zod for runtime validation
- Vitest
- Playwright for critical browser flows

Do not require live Supabase credentials or a paid AI API to run the basic app locally.
Keep deterministic local/mock seams for unfinished external services.

## Architecture principles

Keep presentation, domain/data logic, and external-service adapters separated.

Prefer a structure similar to:
- `src/app/`
- `src/components/`
- `src/features/`
- `src/data/`
- `src/lib/ai/`
- `src/lib/supabase/`
- `src/types/`

Do not force this structure when the existing repository has a clearer idiomatic layout.

Fashion content should be structured and reusable. Items, styles, outfits, colors,
occasions, and editorial stories must link through stable IDs/slugs instead of being
duplicated across pages.

AI recommendations must be grounded in Bí Mặc catalog entities. Do not implement
the stylist as image → LLM → arbitrary outfit prose.

## Domain shape at a glance

```text
Nav: Trang chủ | Tủ đồ | AI phối đồ | Phối theo style | Tủ đồ của tôi
Routes: / · /wardrobe/[category]/[slug] · /styles/[slug] · /stylist ·
        /closet/{items,looks,styles} · /stories/[slug]
```

Catalog entities link by stable slug: `fashion_items`, `categories`, `styles`,
`outfits`, `colors`, `occasions`, `articles`, plus join tables. User-owned:
`profiles`, `saved_items`, `saved_outfits`, `saved_styles`. Public
item/style/outfit/story URLs must be shareable without session state.

Stylist pipeline (do not collapse it): optional photo + questionnaire → structured
analysis → style/palette/preferences → catalog retrieval → ranking → recommendation
→ "why this works".

Tokens: Warm Ivory `#F5F0E8` · Burgundy `#681F32` · Chocolate `#49312B` ·
Soft Taupe `#B7A89B` · Ink Black `#151515`.

## Working style

Before broad changes:
1. inspect the repository and current git diff
2. identify the relevant product/spec files
3. make the smallest coherent change that satisfies the current milestone
4. preserve existing working patterns unless there is a clear reason to improve them
5. record material architecture/product decisions in `docs/11_DECISIONS.md`

Do not silently expand scope.
Do not make git commits unless explicitly requested.
Never claim validation passed unless the command actually passed.

For multi-file milestone work, use the `implementing-milestone` skill.
Before declaring implementation work complete, use the `verifying-changes` skill.
For visual pages and components, use the `reviewing-ui` skill when relevant.

## Product character

Bí Mặc should feel editorial, feminine without being overly cute, modern, refined,
premium, and approachable.

It should not look like:
- a SaaS dashboard
- a generic ecommerce storefront
- a card-heavy template
- a neon/gradient-heavy AI product

The design system in `docs/06_DESIGN_SYSTEM.md` is authoritative for visual direction.

## Privacy baseline

User photos are private data.

Never:
- expose service-role credentials to the client
- make user photos public by default
- infer sensitive personal characteristics
- score attractiveness
- present subjective visual analysis as scientific fact

Follow `docs/07_SECURITY_PRIVACY.md` for auth, storage, and RLS-sensitive work.
