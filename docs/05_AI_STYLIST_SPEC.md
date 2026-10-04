# 05 — AI Stylist Specification

## Objective

Provide personalized styling suggestions that combine:

1. optional photo context
2. explicit user preferences
3. Bí Mặc's structured fashion knowledge/catalog

The feature is not a free-form chatbot in MVP.

## Product flow

```text
Photo (optional)
+
Questionnaire
        │
        ▼
Structured analysis
        │
        ▼
Style/palette/item preferences
        │
        ▼
Catalog retrieval and ranking
        │
        ▼
Outfit assembly/retrieval
        │
        ▼
Short explanation: “Why this works”
```

## Required questionnaire fields

At minimum:

- main occasions: work / school / casual / date / event
- fit preference: fitted / relaxed / oversized / unsure
- avoid list: configurable choices such as cropped, sleeveless, short skirts, high heels, bright colors
- goal: find my style / create outfits / find colors / refresh wardrobe

All fields should support an “unsure / no preference” path where reasonable.

## Photo behavior

Photo input is optional.

If provided:

- explain that it is used to support styling suggestions
- keep it private
- avoid public buckets/URLs
- provide a deletion/lifecycle policy before production launch
- do not infer sensitive personal traits
- do not claim precise scientific body or seasonal-color classification from one image

## Structured provider input

Example conceptual contract:

```ts
type StylistInput = {
  image?: PrivateImageReference;
  occasions: string[];
  fitPreference?: 'fitted' | 'relaxed' | 'oversized' | 'unsure';
  avoids: string[];
  goal: 'style' | 'outfits' | 'colors' | 'wardrobe-refresh';
};
```

## Structured AI output

Validate with Zod. Example conceptual shape:

```ts
type StylistAnalysis = {
  styleDirections: Array<{
    styleSlug: string;
    affinity: number; // treat as ranking signal, not scientific probability
    reason: string;
  }>;
  palette: Array<{
    colorSlug: string;
    reason: string;
  }>;
  recommendedItemTags: string[];
  notes: string[];
};
```

Do not expose fake precision. A value such as `0.86` is an internal ranking signal, not “86% objectively your style”. UI copy should reflect that distinction.

## Grounding phase

After analysis:

1. resolve style/color identifiers against known Bí Mặc entities
2. query/rank matching catalog items and existing outfits
3. prefer complete outfits already curated in the catalog
4. only assemble new combinations when rules/data support them
5. return stable item/style/outfit IDs or slugs for every recommendation

The user should be able to click from a recommendation into real Bí Mặc content.

## “Why this works”

Explanation should be concise and grounded in explicit factors such as:

- requested occasion
- fit preference
- palette relationship
- silhouette balance
- selected style principles
- avoidance constraints

Avoid subjective attractiveness claims.

## Development provider

Implement deterministic mock data first.

Example behavior:

- known fixed questionnaire fixture → fixed valid `StylistAnalysis`
- no API key required
- UI and retrieval/ranking can be built/tested independently of a model vendor

## Production provider seam

External provider integration should be isolated behind the adapter defined by the architecture. Provider-specific request/response types must not leak throughout the app.

## Failure states

Handle at least:

- invalid/unsupported image
- analysis timeout/provider error
- malformed AI output
- no catalog matches
- user removes photo before submission

The UI should fail gracefully and still offer non-AI style discovery.
