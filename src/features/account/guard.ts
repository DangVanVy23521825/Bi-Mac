// One place that decides "is anyone signed in, and what do we show for
// it". This is the whole route boundary for the app — pages that need a
// user call `requireUserId()`, everything that only needs to *render*
// differently calls `getAuthState()`. Nothing else in `src/` should talk
// to `supabase.auth.getUser()` directly; that keeps "what signed-out means
// for the UI" as one policy instead of scattered re-implementations.
//
// `getAuthState()` cannot reuse `getCurrentUserId()` (Task 1): it needs
// `user.user_metadata` for `displayName`, not just the id, so it owns its
// own `createSupabaseServerClient()` + `auth.getUser()` call.
// `requireUserId()` only needs the id, so it reuses `getCurrentUserId()`.
//
// Both call sites guard `auth.getUser()` against throwing. Task 1's review
// flagged `getCurrentUserId()` for not doing this itself — a network
// hiccup or a Supabase outage throws straight through it. That was Minor
// there because nothing called it yet; it stops being Minor the moment
// this file becomes the first caller on every page render. The guard sits
// here, not inside `session.ts`, for two reasons: `session.ts` is a
// reviewed, already-committed Task 1 module outside this task's scope, and
// `getAuthState()` already needs its own `auth.getUser()` call anyway
// (for the reason above), so co-locating both guards here keeps the one
// policy — a Supabase error degrades to "no user", the same outcome a real
// signed-out visitor gets — in one place instead of split across a
// low-level data accessor and this boundary. A thrown error here would be
// exactly the kind of transient backend outage CLAUDE.md says the app must
// degrade through, not crash on.

import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/session'

export type AuthState =
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; displayName: string | null }

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { status: 'unconfigured' }

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { status: 'unconfigured' }

  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return { status: 'signed-out' }

    const metadata = user.user_metadata as Record<string, unknown> | undefined
    const displayName =
      (metadata?.full_name as string | undefined) ??
      (metadata?.name as string | undefined) ??
      user.email ??
      null

    return { status: 'signed-in', displayName }
  } catch {
    // See module comment: a transient auth-server error reads as
    // signed-out, never as a crashed page.
    return { status: 'signed-out' }
  }
}

export async function requireUserId(): Promise<string> {
  let userId: string | null
  try {
    userId = await getCurrentUserId()
  } catch {
    userId = null
  }

  if (!userId) redirect('/')
  return userId
}
