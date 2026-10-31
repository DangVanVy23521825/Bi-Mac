// Server-side Supabase client. This module imports `next/headers`, which
// only resolves inside a Server Component/Route Handler render — never
// import this file from `client.ts` or any `'use client'` module, or the
// build fails (this is the thing `pnpm build` catches that `pnpm test`
// cannot: jsdom has no concept of "client bundle").
//
// Returns `null` when Supabase isn't configured, same contract as
// `getSupabaseEnv` — callers (Task 13+) are written to check for `null`
// and degrade instead of this throwing.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { getSupabaseEnv } from './env'

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv()
  if (!env) return null

  const cookieStore = await cookies()

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // `cookieStore.set` throws when called from a Server Component
          // render (Next.js only allows cookie writes from Server Actions
          // and Route Handlers). That's fine here: it just means an auth
          // token refresh during a read-only render doesn't get persisted
          // this time — the next request re-reads the still-valid session
          // cookie and retries. There is no middleware in this app (yet)
          // to proactively refresh sessions, so this fallback is the only
          // safety net; swallowing the error is intentional, not a bug.
        }
      },
    },
  })
}
