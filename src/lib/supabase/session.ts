// Thin helper over the server client for the one thing almost every
// caller actually wants: "who is logged in, if anyone". Kept separate from
// `server.ts` so call sites that only need the user id don't also have to
// know the `SupabaseClient | null` shape and re-derive this same
// null-check/`auth.getUser()` dance themselves.

import { createSupabaseServerClient } from './server'

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
