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
- timestamps

### `categories`

- `id`
- `slug`
- `name`
- `sort_order`

### `styles`

- `id`
- `slug` unique
- `name`
- `description`
- `hero_image_url`
- `principles` jsonb/text
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
