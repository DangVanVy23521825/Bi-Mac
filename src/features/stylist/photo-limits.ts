// Photo validation limits shared between the API route
// (`src/app/api/stylist/route.ts`, re-exports these) and the client-side
// `Questionnaire` form (`src/components/stylist/Questionnaire.tsx`), so
// both sides reject the same file for the same reason instead of drifting.
//
// Pure data, no imports — safe to pull into a 'use client' bundle. Do not
// import `route.ts` directly from client code: it also imports the
// Gemini provider, the rate limiter, and the full catalog, none of which
// belong in the browser bundle.
export const MAX_PHOTO_BYTES = 4_000_000
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
