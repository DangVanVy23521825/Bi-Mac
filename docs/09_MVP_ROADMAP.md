# 09 — MVP Roadmap

> **Superseded in part by** `docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md`
> (ADR-015). Read the spec before following this document.

## Milestone 0 — Foundation

Goal: a runnable, visually credible Bí Mặc shell.

Deliver:

- Next.js + TypeScript project
- design tokens and typography
- responsive global navigation/footer
- route placeholders
- representative homepage
- typed local data boundary
- Supabase and AI adapter seams
- test/build setup

Exit criteria: repository installs, runs, tests, and builds successfully without production credentials.

## Milestone 1 — Fashion Knowledge Core

Goal: Wardrobe and Style become real connected product experiences.

Deliver:

- category and item detail routes
- style index/detail
- outfit data and reusable look component
- cross-links among item/style/outfit/color/occasion
- realistic typed seed dataset

Exit criteria: a visitor can browse multiple complete discovery loops without AI or login.

## Milestone 2 — Supabase Domain + Auth + My Closet

Goal: persistent personal saves.

Deliver:

- migrations for core public/user tables
- seed strategy
- Supabase Auth
- RLS
- save/unsave item/outfit/style
- My Closet pages and empty states

Exit criteria: two users cannot access each other's personal records and save flows pass tests.

## Milestone 3 — AI Stylist MVP

Goal: structured personal recommendations grounded in catalog data.

Deliver:

- questionnaire
- optional private image upload
- mock provider flow first
- production provider adapter when configured
- schema-validated analysis
- catalog retrieval/ranking
- recommendation result UI
- save recommended look where supported

Exit criteria: complete flow works with mock provider; production provider is an optional configuration, not a local-development requirement.

## Milestone 4 — Editorial Content + Admin Workflow

Goal: make ongoing content maintenance practical.

Possible deliverables:

- article publishing workflow
- lightweight internal admin or CMS integration
- content preview/draft behavior
- richer story relationships

Do not build a large CMS before content-maintenance pain is real.

## Milestone 5 — Polish / Release

- SEO metadata and social previews
- performance review
- accessibility pass
- image optimization review
- analytics/events
- error monitoring
- security/RLS verification
- production privacy copy
- deployment configuration
- launch checklist

## Explicitly deferred to post-MVP

- virtual try-on
- retailer integration
- live shopping links/price comparison
- automated personal wardrobe ingestion
- native mobile app
- social network features
- learned recommendation model trained on behavior
