# Initial Prompt for Claude Code — Bí Mặc

Paste the prompt below into Claude Code from the repository root after copying this
starter pack into the repo.

---

Initialize **Bí Mặc** and implement **Milestone 0 — Foundation**.

Before editing code:

1. Read `CLAUDE.md`.
2. Read:
   - `docs/00_PROJECT_CONTEXT.md`
   - `docs/01_PRD.md`
   - `docs/02_INFORMATION_ARCHITECTURE.md`
   - `docs/03_TECH_ARCHITECTURE.md`
   - `docs/06_DESIGN_SYSTEM.md`
   - `docs/07_SECURITY_PRIVACY.md`
   - `docs/09_MVP_ROADMAP.md`
   - `docs/10_ACCEPTANCE_CRITERIA.md`
   - `docs/12_TASK_BACKLOG.md`
3. Inspect the current repository, `git status`, and existing implementation before
   assuming it is empty.
4. Use the `implementing-milestone` skill for this task.
5. Create/update `docs/plans/0001-foundation.md`.

## Goal

Deliver a polished, runnable foundation for Bí Mặc — a Vietnamese women's fashion
knowledge and personal styling platform.

This milestone is **not** the full product.

Do not implement ecommerce, checkout, payment, seller, or marketplace functionality.

## Technical baseline

If the repository is empty, initialize in the current directory using:
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- pnpm
- shadcn/ui only where useful and customized
- Zod
- Vitest
- Playwright-ready structure

Prepare Supabase-compatible and AI-provider adapter seams, but do not require live
Supabase credentials or paid AI API keys for local development.

## Milestone 0 deliverables

Implement:

1. Clean application scaffold.

2. Global design foundations based on `docs/06_DESIGN_SYSTEM.md`.

3. Responsive primary navigation:
   - Trang chủ
   - Tủ đồ
   - AI phối đồ
   - Phối theo style
   - Tủ đồ của tôi

4. Intentional route shells:
   - `/`
   - `/wardrobe`
   - `/stylist`
   - `/styles`
   - `/closet`

5. A polished homepage foundation with:
   - editorial hero
   - Trending Now
   - Color Story
   - The Wardrobe
   - Find Your Style
   - Ask Bí Mặc / AI Stylist CTA
   - Fashion Stories

6. Small typed local demo data for the homepage.
   Do not put large content arrays directly in page components.

7. External-service seams:
   - Supabase client/server adapter placeholders
   - `.env.example`
   - AI provider interface
   - deterministic mock AI provider

8. Basic tests:
   - at least one meaningful unit test
   - at least one rendered/smoke-level test for a key UI section or flow

9. Update `README.md` with exact local commands.

## Visual quality bar

The first render should already communicate the brand.

Aim for:
- warm ivory
- burgundy / chocolate / ink accents
- editorial serif display typography
- readable sans-serif UI/body typography
- generous whitespace
- strong image-led layout
- restrained borders and shadows

Avoid:
- SaaS dashboard styling
- generic ecommerce styling
- excessive rounded cards
- gradients/glassmorphism
- noisy motion
- too many icons

## Architecture constraints

Keep presentation, domain/data, and external providers separated.

Do not build AI Stylist as:

image → LLM → arbitrary outfit text

Preserve the future architecture:

optional photo + questionnaire
→ structured analysis
→ style/palette/preferences
→ Bí Mặc catalog retrieval
→ ranking/outfit selection
→ recommendation
→ WHY THIS WORKS

For this milestone, only create the interface/mock seam needed to support that design.

## Scope control

Do not continue into later milestones simply because the foundation finishes early.

If you make a durable architecture decision not already covered by the docs, record it
briefly in `docs/11_DECISIONS.md`.

Do not commit unless I explicitly ask you to.

## Verification

Before finishing, use the `verifying-changes` skill.

At minimum, run all applicable repository checks such as:
- lint
- typecheck
- unit tests
- production build

Run Playwright if it is configured and executable in the environment.

## Final response

Report:
- what you created
- key architecture choices
- validation commands and actual results
- anything intentionally deferred
- the recommended next task from `docs/12_TASK_BACKLOG.md`

Begin by inspecting the repository and writing the Milestone 0 plan.
