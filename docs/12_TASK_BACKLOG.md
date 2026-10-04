# 12 — Initial Task Backlog

This is the initial ordered backlog. For substantial tasks, create an ExecPlan.

## P0 — Foundation

- [ ] Initialize Next.js + TypeScript + pnpm project in repository root
- [ ] Configure strict TypeScript, linting, typecheck script
- [ ] Configure Tailwind and global design tokens
- [ ] Choose and wire display/body fonts
- [ ] Build responsive SiteHeader and navigation
- [ ] Build Footer
- [ ] Create public route placeholders
- [ ] Create editorial homepage shell
- [ ] Add typed local homepage fixtures/repository functions
- [ ] Create Supabase adapter stubs + `.env.example`
- [ ] Create AI provider interface + deterministic mock
- [ ] Configure Vitest
- [ ] Add first unit/smoke tests
- [ ] Ensure lint/typecheck/test/build pass

## P1 — Wardrobe + Styles + Outfits

- [ ] Define TypeScript domain types
- [ ] Create realistic seed catalog
- [ ] Wardrobe index
- [ ] Wardrobe category page
- [ ] Item detail page
- [ ] Style index
- [ ] Style detail page
- [ ] Reusable OutfitLook component
- [ ] Outfit route/detail if required by UX
- [ ] Item ↔ style relations
- [ ] Item ↔ outfit relations
- [ ] Color/occasion rendering
- [ ] Related content navigation
- [ ] E2E browse tests

## P2 — Supabase + Authentication + My Closet

- [ ] Write migrations
- [ ] Seed database
- [ ] Create server/browser Supabase clients
- [ ] Auth flow
- [ ] RLS for user-owned tables
- [ ] Save item
- [ ] Save outfit
- [ ] Save style
- [ ] Closet pages
- [ ] Empty states
- [ ] RLS/auth tests

## P3 — AI Stylist

- [ ] Stylist questionnaire UI
- [ ] Zod input schema
- [ ] Optional image upload UI
- [ ] Private upload/storage flow
- [ ] Mock analysis flow
- [ ] Zod output schema
- [ ] Catalog grounding/retrieval function
- [ ] Ranking logic
- [ ] Recommendation result UI
- [ ] “Why this works” rendering
- [ ] Provider error/fallback states
- [ ] Optional production provider integration
- [ ] AI flow tests

## P4 — Editorial content workflow

- [ ] Story detail template
- [ ] Article relationships
- [ ] Decide lightweight admin vs external CMS only after real need is observed

## P5 — Release quality

- [ ] SEO metadata
- [ ] Open Graph assets
- [ ] Accessibility review
- [ ] Performance review
- [ ] Security/RLS review
- [ ] Analytics/event plan
- [ ] Error monitoring
- [ ] Production privacy content
- [ ] Vercel production configuration
- [ ] Launch checklist
