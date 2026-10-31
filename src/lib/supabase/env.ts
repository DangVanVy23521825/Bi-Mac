// Supabase configuration seam. Every function here must degrade to `null`
// instead of throwing — the product rule (CLAUDE.md, docs/07) is that the
// app boots, typechecks, and passes its test suite with zero Supabase
// variables set. A thrown error (or a logged secret) at module load time
// would break that for every caller downstream, so validation failures are
// just a `null` return, never an exception and never a console log of the
// values being validated.
//
// `source` is a parameter (default `process.env`) rather than a direct
// `process.env` read so tests can pass a plain object instead of mutating
// the real environment — see vitest.config.mts for why tests must never
// depend on what the invoking shell happens to export.

import { z } from 'zod'

export type SupabaseEnv = {
  url: string
  anonKey: string
}

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export function getSupabaseEnv(
  source: Record<string, string | undefined> = process.env,
): SupabaseEnv | null {
  const result = supabaseEnvSchema.safeParse(source)
  if (!result.success) return null

  return {
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function isSupabaseConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return getSupabaseEnv(source) !== null
}
