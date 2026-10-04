# 07 — Security & Privacy

## Baseline

Security and privacy requirements are product requirements, especially because AI Stylist may accept user photos.

## Secrets

- Never commit real `.env` secrets.
- Keep server/service-role credentials server-only.
- Browser code may only receive credentials explicitly designed to be public, such as a Supabase anon/publishable key under correct RLS protections.
- Maintain `.env.example` with names and descriptions only.

## Authentication

Use Supabase Auth when persistent personal features are enabled.

Public browsing should not require login.

## Row Level Security

Enable RLS on all user-owned tables.

Policy intent:

```text
profiles       → owner only
saved_items    → owner only
saved_outfits  → owner only
saved_styles   → owner only
stylist data   → owner only unless deliberately anonymous/ephemeral
```

Never rely on hiding UI elements as an authorization mechanism.

## User photos

- Store in a private bucket.
- Use short-lived signed access or server-controlled access when required.
- Do not expose predictable public URLs.
- Define retention/deletion behavior before production.
- Avoid retaining original photos longer than necessary for the product experience.
- Do not log image bytes or signed URLs in application logs.

## Upload validation

Before production, enforce:

- accepted image MIME types
- reasonable maximum file size
- image decode validation
- filename/path sanitization by generating server-controlled object names

## AI privacy boundary

Before sending a photo to a production AI provider, the product must explicitly know:

- which provider is used
- what content is transmitted
- whether provider retention settings meet product requirements
- what user-facing disclosure/consent is needed

Do not implement hidden provider transmission as a shortcut.

## Content safety / sensitive inference

AI Stylist must not infer or rank sensitive attributes such as race, ethnicity, health, religion, sexual orientation, or similar traits from a user's photo.

Styling recommendations must not demean, shame, or score the user's body or attractiveness.

## Server actions / APIs

- validate inputs
- authorize user-owned mutations server-side
- avoid leaking internal errors/secrets to clients
- use idempotent semantics for save/unsave where practical

## Dependency/security maintenance

Before production release:

- run dependency audit/review
- confirm supported framework versions
- confirm security headers
- confirm image/domain allowlists
- confirm production RLS policies through real tests
