# 04 — Initial Data Model

This is the conceptual schema. Final SQL belongs in versioned migrations.

## Public catalog/content entities

### `fashion_items`

- `id` UUID PK
- `slug` text unique not null
- `name` text not null
- `category_id` UUID FK
- `subcategory` text nullable
- `description` text
- `characteristics` text/jsonb
- `how_to_style` text/jsonb
- `what_to_avoid` text/jsonb
- `image_url` text
- `status` enum/text: draft | published
- `occasions` text[]/jsonb — occasion slugs this item suits (`Occasion`: work, school, casual, date, event); feeds the AI Stylist's occasion hard filter (ADR-016), not only editorial copy
- `fit` text nullable — one `Fit` value (fitted, relaxed, oversized); `null` means the item doesn't carry a fit signal and never matches a user's fit preference
- `attributes` text[]/jsonb — `ItemAttribute` tags such as sleeveless, cropped, high-heel; this is what the Stylist's avoid-list excludes against, and `getAvoidOptions()` derives the questionnaire's avoid choices from whichever attributes actually appear here across the catalog (ADR-016)
- four long-form content fields, each editorial prose (not metadata): `whatItIs`, `characteristics` (as prose, distinct from any structured characteristics above), `howToStyle`, `whatToAvoid` — the ~250 words of per-item copy described in the direction spec
- timestamps

Suitable styles, compatible colors, and example outfits shown on an item's page are **derived**, never stored on `fashion_items` directly: "suitable styles" comes from the item's `styleSlugs` cross-referenced against `styles`, "compatible colors" from `colorSlugs` against `colors`, and "example outfits" from scanning `outfits.itemSlugs` (plus the same-style top-up in ADR-017). There is deliberately no second, denormalized copy of any of these lists — the slug arrays on `fashion_items`/`outfits` are the only source of truth, and every "suitable styles" style page or "example outfits" section is a query over them, not an independently maintained field.

### `categories`

- `id`
- `slug` — one of `tops`, `bottoms`, `dresses`, `outerwear`, `accessories` (`CategorySlug`)
- `name`
- `intro` — short editorial paragraph introducing the category, shown on its wardrobe listing page
- `sort_order`

### `styles`

- `id`
- `slug` unique
- `name`
- `description`
- `hero_image_url`
- `principles` jsonb/text
- `paragraphs` text[]/jsonb — the style's editorial body copy, one entry per paragraph, shown on the style detail page
- `outfit_formulas` text[]/jsonb — short "how to build this look" formula strings (e.g. "sơ mi + chân váy midi + blazer") distinct from the `outfits` actually linked to the style; these are prose guidance, not a reference to any `outfit` row
- `status`
- timestamps

### `colors`

- `id`
- `slug`
- `name`
- `hex` nullable
- `family` nullable

### `occasions`

- `id`
- `slug`
- `name`

### `outfits`

- `id`
- `slug` unique
- `name`
- `description`
- `hero_image_url`
- `why_it_works`
- `season` nullable
- `occasions` text[]/jsonb — occasion slugs this outfit is appropriate for (`Occasion`); the AI Stylist's occasion hard filter matches against this, not against the outfit's individual items
- `status`
- timestamps

### `articles`

- `id`
- `slug` unique
- `title`
- `excerpt`
- `body` or structured content
- `cover_image_url`
- `article_type` (trend, color-story, styling, editorial)
- `published_at`
- `status`
- timestamps

## Join tables

Prefer normalized relations where they add product value.

### `outfit_items`

- `outfit_id`
- `fashion_item_id`
- `role` nullable
- `sort_order`

Unique pair where appropriate.

### `fashion_item_styles`

- `fashion_item_id`
- `style_id`
- optional `weight`

### `fashion_item_colors`

- `fashion_item_id`
- `color_id`
- optional relationship type

### `fashion_item_occasions`

- `fashion_item_id`
- `occasion_id`

### `outfit_styles`

- `outfit_id`
- `style_id`
- optional `weight`

### `outfit_colors`

- `outfit_id`
- `color_id`

### article relations

Use explicit article-to-item/style/outfit relations if editorial cross-linking needs them. Do not overload the article body as the only place relationships exist.

## User entities

### `profiles`

- `id` / user reference
- `display_name` nullable
- `avatar_url` nullable
- preferences jsonb nullable
- timestamps

### `saved_items`

- `user_id`
- `fashion_item_id`
- `created_at`

Unique `(user_id, fashion_item_id)`.

### `saved_outfits`

- `user_id`
- `outfit_id`
- `created_at`

Unique `(user_id, outfit_id)`.

### `saved_styles`

- `user_id`
- `style_id`
- `created_at`

Unique `(user_id, style_id)`.

## AI entities — introduce only when persistence is needed

### `stylist_sessions`

Possible fields:

- `id`
- `user_id` nullable depending on product decision
- `input_preferences` jsonb
- `analysis` jsonb
- `created_at`
- `expires_at` nullable

### Photo storage

Do not store a public photo URL. Store a private object path/reference with explicit access policy and deletion behavior.

## RLS intent

Public published catalog/content: readable by everyone.

User-owned saved/profile/stylist data: readable/writable only by the owning authenticated user, except for narrowly scoped trusted server operations if needed.

## Indexing intent

Create indexes based on actual query patterns, particularly:

- unique slugs
- join-table FK pairs
- user_id on saved tables
- status/published_at for articles

Avoid speculative indexes before representative queries exist.
