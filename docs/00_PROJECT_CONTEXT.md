# 00 — Project Context

## Brand

**Bí Mặc**

A Vietnamese women's fashion knowledge and personal styling platform.

The Vietnamese name plays with the idea of discovering the “secret of dressing well”. The product should feel intelligent and editorial, not gimmicky.

## Problem

Many users can see fashionable clothes online but still struggle with questions such as:

- What is this item and why is it useful?
- What can I wear it with?
- What combinations should I avoid?
- Which styles use this item?
- What colors work together?
- What should I wear for a particular occasion?
- Which style direction feels most like me?
- How can I save outfits and return to them later?

Most fashion sites optimize for selling individual products. Bí Mặc should optimize for **understanding and combining fashion**.

## Product promise

Bí Mặc helps users move through four actions:

1. **Discover** trends, colors, items, styles, and editorial stories.
2. **Understand** how individual fashion items work and how to combine them.
3. **Personalize** suggestions using stated preferences plus optional photo input.
4. **Save** useful items, styles, and looks into a personal closet.

## Core product model

The central product asset is a structured fashion knowledge base:

```text
fashion items ↔ styles ↔ outfits ↔ colors ↔ occasions
```

Home, Wardrobe, Style, My Closet, and AI Stylist should all reuse this shared domain model.

## Target audience for MVP

Primary:

- Vietnamese women who want practical styling guidance
- users interested in elegant, modern, wearable fashion
- users who enjoy fashion content but do not consider themselves styling experts

The MVP should not assume advanced fashion terminology.

## MVP value proposition

A visitor should be able to enter through an editorial story, a style, a wardrobe item, or AI Stylist and still naturally discover related parts of the product.

Examples:

```text
Chocolate Brown trend
→ See how to style
→ Brown wide-leg trousers
→ Suggested outfits
→ White shirt detail
→ Save outfit
```

```text
Styles
→ Modern Classic
→ Outfit examples
→ Save
→ Ask AI to create similar recommendations for me
```

## Non-goals for MVP v1

- ecommerce checkout
- shopping cart
- payment processing
- seller marketplace
- live retailer inventory aggregation
- virtual try-on
- automatic full wardrobe scanning from hundreds of user photos
- social feed/comments/following
- native mobile app
- complex recommendation ML training pipeline
- exact scientific body classification from images

## Product principles

### Education before commerce
Explain why something works instead of only showing products.

### Recommendations should be traceable
A recommendation should connect back to known items, style tags, color relationships, or user preferences.

### Personalization without judgment
Use language such as “you may prefer”, “worth trying”, and “this combination supports…” rather than declaring objective rules about a person's body or attractiveness.

### Editorial quality
The product should feel curated. Fewer strong pieces of content are better than a large low-quality catalog.

### Connected experience
Avoid isolated pages. Related items, looks, styles, colors, and articles should create meaningful paths through the site.
