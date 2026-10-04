# 0001 — Milestone 0: Foundation

> **SUPERSEDED (2026-10-04).** This plan assumed the `docs/09` milestone order and a
> mock-first AI Stylist. Replaced by
> `docs/superpowers/plans/2026-10-04-m0-foundation-m1-art-direction.md`.

Status: proposed (not yet implemented)
Source: `docs/09_MVP_ROADMAP.md` (Milestone 0), `docs/12_TASK_BACKLOG.md` (P0),
`PROMPT_INIT_CLAUDE.md`

## Goal

A runnable, visually credible Bí Mặc shell: the first render already communicates the
brand, the five product areas are reachable, and `lint` / `typecheck` / `test` / `build`
all pass with no Supabase credentials and no paid AI key.

## In scope

1. Next.js App Router + TypeScript (strict) + Tailwind + pnpm scaffold in the repo root.
2. Design foundations from `docs/06_DESIGN_SYSTEM.md`: color tokens, display/body font
   pair, type scale, spacing/section rhythm, thin rules.
3. Responsive `SiteHeader` + `MobileNavigation` + `Footer`.
4. Route shells: `/`, `/wardrobe`, `/stylist`, `/styles`, `/closet`.
5. Editorial homepage with the eight sections in `docs/02_INFORMATION_ARCHITECTURE.md`:
   hero, Trending Now, Color Story, The Wardrobe, Featured Looks, Find Your Style,
   Ask Bí Mặc (AI CTA), Fashion Stories.
6. Small typed fixture set behind repository functions (`src/data/`), not inline arrays
   in page components.
7. External-service seams: Supabase browser/server client placeholders, `.env.example`,
   `StylistProvider` interface + deterministic mock.
8. Vitest configured; one meaningful unit test + one rendered smoke test.
9. `README.md` updated with the exact local commands.

## Out of scope

Deferred to later milestones, even if the foundation finishes early:

- wardrobe/style/outfit detail routes and the full seed catalog (M1)
- Supabase migrations, Auth, RLS, real save/unsave (M2)
- real questionnaire, photo upload, grounding/ranking (M3) — M0 ships only the interface
- any cart / checkout / payment / seller / marketplace surface (ADR-001, permanently out)
- Playwright specs (structure prepared, flows written in M1 alongside real routes)
- shadcn/ui components, unless a specific primitive is genuinely needed and restyled

## Implementation steps

### 1. Scaffold

- `pnpm create next-app` in the repository root (App Router, TypeScript, Tailwind,
  `src/` dir, ESLint). Keep the generated layout; do not fight idiomatic Next.js.
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test`,
  `test:watch`.
- Strip the default Next.js boilerplate page/CSS before building real UI.

### 2. Design tokens

- Tokens as CSS custom properties in `src/app/globals.css`, exposed to Tailwind via
  `@theme` / the Tailwind config: `--color-ivory #F5F0E8`, `--color-burgundy #681F32`,
  `--color-chocolate #49312B`, `--color-taupe #B7A89B`, `--color-ink #151515`.
- Semantic aliases (`background`, `foreground`, `accent`, `accent-secondary`, `muted`)
  so components never reference raw hex.
- Fonts via `next/font/google`: display + body as two CSS variables. Serif display is
  for headings/eyebrows only; body/UI/navigation is sans.
- Type scale with a deliberate editorial jump between display and body; mobile body
  stays >= 16px.
- No gradients, no glassmorphism, minimal radius, borders as thin ivory/taupe rules.

### 3. Shell

- `src/components/layout/SiteHeader.tsx` — wordmark + the five Vietnamese nav labels,
  active-route state, sans uppercase or small-caps labels.
- `MobileNavigation` — client component, sheet/overlay, focus trap, Escape to close,
  `aria-expanded`; the header itself stays a server component.
- `Footer` — brand line, section links, privacy link placeholder.
- `src/app/layout.tsx` — fonts, `lang="vi"`, metadata base, header/footer, `<main>`.

### 4. Route shells

- `/wardrobe`, `/stylist`, `/styles`, `/closet` as intentional, branded shells — a real
  section heading and one honest sentence about what is coming, not "Coming soon" cards.
- `/closet` additionally shows the anonymous empty state shape it will keep in M2
  (invitation back into discovery, per `docs/02`).

### 5. Typed data boundary

- `src/types/` — `FashionItem`, `Style`, `Outfit`, `Color`, `Occasion`, `Article`, all
  slug-keyed; only the fields the homepage actually renders.
- `src/data/fixtures/` — a deliberately small representative set drawn from
  `docs/08_SEED_CONTENT.md`: ~6 items, 5 styles (Modern Classic, Quiet Luxury,
  Minimalist, Soft Feminine, Casual Chic), 2–3 outfits, 3–4 colors, 3–4 stories.
  Every record demonstrates a real relationship; no lorem ipsum.
- `src/data/` repository functions as the only thing pages call:
  `getFeaturedStories()`, `getTrendingItems()`, `getColorStory()`,
  `getEssentialItems()`, `getFeaturedLooks()`, `getStyles()`. Async signatures now so
  the Supabase swap in M2 does not touch presentation.
- Homepage links point at future real routes (`/wardrobe/[category]/[slug]`,
  `/styles/[slug]`, `/stories/[slug]`). Where the target does not exist yet, link to the
  section index rather than shipping a dead href.

### 6. Homepage sections

- One component per section under `src/components/editorial/`, each taking typed props.
- Reusable primitives: `SectionHeading`, `StoryCard`, `FashionItemTile`, `OutfitLook`,
  `ColorSwatch`, `EditorialCTA`.
- Asymmetric grid in at least two sections; at most one full-bleed block; hover limited
  to a modest image scale/opacity change behind `prefers-reduced-motion`.
- Aspect ratios reserved per `docs/06`: hero editorial crop, stories 4:5, looks 3:4.

### 7. Service seams

- `src/lib/supabase/client.ts` (browser, anon key) and `server.ts` (request-scoped
  cookie client). Both read env lazily and throw a clear configuration error only when
  actually invoked — importing them must not break a credential-free local run. No
  service-role key anywhere in M0.
- `.env.example` with names and comments only: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STYLIST_PROVIDER` (`mock` | provider name),
  provider key placeholder.
- `src/lib/ai/types.ts` — `StylistInput`, `StylistAnalysis`, `StylistProvider` per
  `docs/05_AI_STYLIST_SPEC.md`.
- `src/lib/ai/schema.ts` — Zod schemas for both, so mock and future real provider are
  validated by the same code path.
- `src/lib/ai/mock-provider.ts` — deterministic: same input → identical analysis
  referencing real fixture style/color slugs.
- `src/lib/ai/index.ts` — `getStylistProvider()` selecting by env, defaulting to mock.
- No photo upload, no provider network call, no stylist route handler in M0.

### 8. Tests

- Vitest + `@vitejs/plugin-react` + jsdom, `vitest.config.ts` with the `@/` alias and a
  `test/setup.ts`.
- Unit: mock provider output parses against the Zod schema, is deterministic across two
  calls, and every returned style/color slug resolves to a real fixture entity — this is
  the grounding invariant the whole AI Stylist design rests on.
- Smoke: render the homepage hero/stories section with fixture data and assert the
  editorial copy and a real link href.

### 9. Docs

- `README.md`: prerequisites, `pnpm install`, `pnpm dev`, and the full check list,
  stating that no credentials are needed locally.
- `docs/11_DECISIONS.md`: append the decisions below.
- Update the P0 checkboxes in `docs/12_TASK_BACKLOG.md`.
- Update the `## Repository state` section of `CLAUDE.md` once code exists.

## Validation

Run and report actual output:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then exercise `/`, `/wardrobe`, `/stylist`, `/styles`, `/closet` in a dev server at
mobile and desktop widths, with no `.env.local` present, and confirm:

- app boots and every route renders without credentials
- navigation reaches all five areas, mobile menu opens/closes and traps focus
- no homepage link is dead
- no raw hex outside the token definitions

Exit criteria (`docs/09`): installs, runs, tests, and builds successfully without
production credentials.

## Material decisions to record

Proposed for `docs/11_DECISIONS.md` at implementation time:

- **ADR-006 — Font pair:** Cormorant Garamond (display) + Inter (body). Cormorant
  carries the fashion-editorial tone at large sizes while staying free and
  variable-weight; Inter keeps Vietnamese diacritics clean at UI sizes, which Bodoni
  Moda's high contrast does not at small text.
- **ADR-007 — Repository functions are async from day one.** Fixtures return promises so
  the M2 Supabase swap changes only `src/data/` implementations.
- **ADR-008 — No route groups until M2.** `(public)` / `(account)` groups are introduced
  with the authenticated layout boundary, not before there is one.

## Open discoveries

- **The steering files reference tooling that does not exist in this repo.** `CLAUDE.md`
  points at the `implementing-milestone`, `verifying-changes`, and `reviewing-ui` skills,
  and `README.md` describes `.claude/rules/` and `.claude/skills/` — none are present.
  Either copy that part of the starter pack in or drop the references; until then those
  steps degrade to ordinary work.
- **No image assets exist.** M0 uses token-tinted placeholder blocks at the correct
  reserved aspect ratios, so layout rhythm is real even though photography is not. Real
  assets and `next/image` domain allowlisting land with the M1 catalog.
- **Not a git repository yet.** `git init` before implementation so the work is
  reviewable as a diff. No commits without an explicit request.
