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
// `getViewer()` exists for the callers that need BOTH halves of one
// `auth.getUser()` round-trip: what to render, and whose data to read.
// `/wardrobe/[category]/[slug]` and `/styles/[slug]` used to call
// `getAuthState()` and then `getCurrentUserId()` — two independent network
// calls for one question, the second of them unguarded, on the two
// *public, shareable* pages in the product. A transient failure in that
// second call was an error page on the product's front-door URLs. One
// call now answers both, and the guard below covers it.
//
// Why a separate function instead of putting `userId` on `AuthState`'s
// `signed-in` variant: `AuthState` is handed to `SiteHeader`/`AuthMenu`,
// and `AuthMenu` is a client component — anything on that type is
// serialized into the browser payload of every page. The two pages that
// need the id are server-only, so the id has no business travelling
// there. `getAuthState()` stays exactly the shape its consumers already
// expect and is now a thin read of `getViewer()`, so there is still only
// one implementation of "who is signed in".
//
// Both call sites in this file (`getViewer()`, which `getAuthState()`
// reads, and `requireUserId()`) guard `auth.getUser()` against throwing.
// Task 1's review
// flagged `getCurrentUserId()` for not doing this itself — a network
// hiccup or a Supabase outage throws straight through it. That was Minor
// there because nothing called it yet; it stops being Minor the moment
// this file becomes the first caller on every page render. The guard sits
// here, not inside `session.ts`, for two reasons: `session.ts` is a
// reviewed, already-committed Task 1 module outside this task's scope, and
// `getViewer()` already needs its own `auth.getUser()` call anyway
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

/**
 * One `auth.getUser()` round-trip, both answers: `authState` for what to
 * render, `userId` for whose rows to read. `userId` is non-null exactly
 * when `authState.status === 'signed-in'`.
 *
 * A caller that only renders should keep using `getAuthState()`; this one
 * is for a page that renders *and* reads the signed-in user's own data.
 */
export async function getViewer(): Promise<{ authState: AuthState; userId: string | null }> {
  if (!isSupabaseConfigured()) return { authState: { status: 'unconfigured' }, userId: null }

  const supabase = await createSupabaseServerClient()
  if (!supabase) return { authState: { status: 'unconfigured' }, userId: null }

  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) return { authState: { status: 'signed-out' }, userId: null }

    const metadata = user.user_metadata as Record<string, unknown> | undefined
    const displayName =
      (metadata?.full_name as string | undefined) ??
      (metadata?.name as string | undefined) ??
      user.email ??
      null

    return { authState: { status: 'signed-in', displayName }, userId: user.id }
  } catch {
    // See module comment: a transient auth-server error reads as
    // signed-out, never as a crashed page.
    return { authState: { status: 'signed-out' }, userId: null }
  }
}

export async function getAuthState(): Promise<AuthState> {
  const { authState } = await getViewer()
  return authState
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
