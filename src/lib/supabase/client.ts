// Browser-side Supabase client. Pure client code, no `next/headers` import
// (contrast with `server.ts`) — this is what makes it safe to pull into a
// `'use client'` bundle. Cookie read/write for the browser session is
// handled internally by `createBrowserClient` via `document.cookie`; we
// don't need to wire that up ourselves the way `server.ts` does for
// `next/headers`.
//
// Returns `null` when Supabase isn't configured — same contract as every
// other function in this seam.

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from './env'

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const env = getSupabaseEnv()
  if (!env) return null

  return createBrowserClient(env.url, env.anonKey)
}
