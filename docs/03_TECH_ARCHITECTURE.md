# 03 — Technical Architecture

## System overview

```text
Browser
  │
  ▼
Next.js App Router
  │
  ├── public editorial/domain pages
  ├── authenticated closet UI
  ├── route handlers/server actions
  │
  ├─────────────► Supabase
  │                ├── PostgreSQL
  │                ├── Auth
  │                └── Private/Public Storage
  │
  └─────────────► AI Provider Adapter
                   ├── deterministic mock (local/dev)
                   └── production multimodal provider (later/configured)
```

## Architectural boundaries

### Presentation

React components and page composition. No direct database or vendor SDK logic inside visual components.

### Domain/data layer

Typed functions for retrieving items, styles, outfits, articles, relationships, and saved records.

### Supabase adapter

Separate server/browser clients with explicit ownership. Service-role credentials, if ever required, remain server-only.

### AI adapter

Use a provider-neutral interface such as:

```ts
interface StylistProvider {
  analyze(input: StylistInput): Promise<StylistAnalysis>
}
```

The rest of the app should not depend directly on a specific model vendor SDK.

## Rendering strategy

Default to Server Components for public content and data composition.

Use Client Components for:

- photo selection/upload interaction
- questionnaire local interaction
- save/unsave optimistic UI if appropriate
- browser-only UI behavior

Do not make an entire page client-side because one small control needs state.

## Data access

Prefer repository/domain functions, for example:

```text
getFeaturedStories()
getWardrobeItemBySlug()
getStyleBySlug()
getRelatedOutfitsForItem()
getSavedLooksForUser()
```

This keeps initial local seed data replaceable by Supabase later.

## Suggested application structure

```text
src/
  app/
    (public)/
    (account)/
    api/
  components/
    layout/
    editorial/
    wardrobe/
    style/
    stylist/
    closet/
    ui/
  data/
  features/
  lib/
    ai/
    auth/
    supabase/
    validation/
  types/
```

Use route groups only if they improve layout/auth boundaries.

## Content strategy for MVP

Phase 0–1 can use typed seed fixtures through a repository interface.

Phase 2 introduces Supabase tables/migrations and changes repository implementations without rewriting presentation components.

## Testing strategy

### Unit

- color/style matching utilities
- recommendation ranking inputs
- schema validation
- domain transformations

### Integration

- repository behavior
- auth-dependent save operations
- RLS assumptions where feasible in test environment

### End-to-end

Critical MVP paths:

1. visitor browses home → wardrobe item
2. visitor browses style → outfit
3. authenticated user saves/removes an outfit
4. user completes mock AI Stylist flow and receives grounded recommendations

## Observability

MVP should have useful structured errors and server logs without logging private uploaded image contents or secrets.

Analytics can be added after core product behavior stabilizes.
