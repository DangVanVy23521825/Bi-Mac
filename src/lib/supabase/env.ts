// Supabase configuration seam. Every function here must degrade to `null`
// instead of throwing — the product rule (CLAUDE.md, docs/07) is that the
// app boots, typechecks, and passes its test suite with zero Supabase
// variables set. A thrown error (or a logged secret) at module load time
// would break that for every caller downstream, so validation failures are
// just a `null` return, never an exception and never a console log of the
// values being validated.
//
// `source` is a parameter so tests can pass a plain object instead of
// mutating the real environment — see vitest.config.mts for why tests must
// never depend on what the invoking shell happens to export.
//
// Its default is `PUBLIC_ENV` below, NOT `process.env`, and that difference
// is load-bearing on the client. Next/Turbopack substitutes a value into
// the browser bundle only where it *sees* `process.env.NEXT_PUBLIC_FOO`
// written out literally. Defaulting to `process.env` and then reading
// properties off the parameter is a dynamic lookup the bundler cannot
// follow, so nothing gets substituted: on the client `process.env` is
// essentially empty, `getSupabaseEnv()` returns `null`, and
// `createSupabaseBrowserClient()` hands back `null` — the sign-in button
// then does nothing at all, silently.
//
// That was a real bug, and it survived fourteen rounds of review because
// every check we had ran under Node, where `process.env` is real: the unit
// tests pass their own object, the server renders fine, and `pnpm build`
// succeeds because the code is perfectly valid. `env-inlining.test.ts`
// pins the shape so it cannot come back.

import { z } from 'zod'

export type SupabaseEnv = {
  url: string
  anonKey: string
}

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

// Each entry is a literal `process.env.X` member expression — the only
// form the bundler can substitute. Read once at module load, which is also
// what the client bundle ends up holding after substitution.
const PUBLIC_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

export function getSupabaseEnv(
  source: Record<string, string | undefined> = PUBLIC_ENV,
): SupabaseEnv | null {
  const result = supabaseEnvSchema.safeParse(source)
  if (!result.success) return null

  return {
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function isSupabaseConfigured(
  source: Record<string, string | undefined> = PUBLIC_ENV,
): boolean {
  return getSupabaseEnv(source) !== null
}
