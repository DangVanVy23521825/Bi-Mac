# 01 — Product Requirements Document

> **Superseded in part by** `docs/superpowers/specs/2026-10-03-bi-mac-direction-design.md`
> (ADR-010). Read the spec before following this document. The Authentication section
> below no longer requires auth to save.

## MVP modules

### 1. Home

Purpose: operate like a small digital fashion magazine and entry point into the rest of Bí Mặc.

Required sections:

- editorial hero
- Trending Now
- Hot Items / The Wardrobe
- Color Story
- featured outfits
- Find Your Style CTA
- AI Stylist CTA
- Fashion Stories

Home content should be data-driven so it can later come from a CMS/database.

### 2. Wardrobe

Purpose: a fashion dictionary organized by item type.

Initial categories:

- Tops
- Bottoms
- Dresses
- Outerwear
- Accessories

Example items:

- white shirt
- blouse
- T-shirt
- knitwear
- blazer
- straight trousers
- wide-leg trousers
- jeans
- tailored trousers
- A-line skirt
- midi skirt
- shirt dress
- A-line dress
- bag
- shoes
- belt
- jewelry

Each item detail page should support:

- what the item is
- characteristics
- how to style
- what to avoid / common styling mistakes
- suitable styles
- suitable occasions
- compatible colors
- example outfits
- save item action for authenticated users

### 3. AI Stylist

Purpose: provide personal outfit guidance grounded in user-provided preferences and Bí Mặc catalog knowledge.

MVP input:

- optional user photo
- common occasions
- fit preference
- clothing/features user wants to avoid
- goal: discover style / outfit / colors / wardrobe refresh

MVP output:

- suggested style direction(s)
- suggested palette
- suggested silhouettes or item categories
- recommended Bí Mặc items
- several outfit recommendations
- short “Why this works” explanation for each outfit

The system should communicate uncertainty and avoid presenting image-derived conclusions as scientific facts.

### 4. Style exploration

Initial styles:

- Modern Classic
- Quiet Luxury
- Minimalist
- Soft Feminine
- Casual Chic

Each style page should contain:

- short definition
- visual/editorial hero
- characteristic palette
- key items
- styling principles
- outfit formulas
- example looks
- related wardrobe items
- save style action
- CTA into AI Stylist

### 5. My Closet

Authenticated personal area containing:

- Saved Items
- Saved Looks
- Saved Styles

MVP does not require users to upload their entire real-world wardrobe.

## Authentication

Anonymous users can browse all public editorial and fashion knowledge content.

Authentication is required for persistent saves and personal AI history if/when AI history is implemented.

## Cross-linking requirements

Every public domain page should expose meaningful next steps.

Examples:

- article → related items/outfits/styles
- item → related outfits/styles/colors
- style → key items/outfits/AI
- outfit → component items/style/save
- AI result → item detail/style/save

## Content language

Primary product language for MVP: Vietnamese.

Internal code identifiers, schema names, and technical documentation may use English.

## Responsive requirements

Must support:

- mobile width from approximately 360px
- tablet layouts
- desktop editorial layouts

The mobile experience should preserve hierarchy and imagery rather than collapsing into a generic stack of cards.

## Accessibility baseline

- semantic landmarks
- keyboard-accessible controls
- visible focus states
- useful image alt text
- sufficient text contrast
- buttons/links with descriptive accessible labels
- no information conveyed by color alone

## Performance baseline

- use optimized responsive images
- avoid shipping unnecessary client JavaScript
- reserve image dimensions to avoid layout shift
- lazy-load below-the-fold media where appropriate
- avoid heavy animation libraries for MVP
