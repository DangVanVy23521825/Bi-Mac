// GET /auth/callback — the Google OAuth redirect target. Supabase's PKCE
// flow sends the browser back here with a `code` query param; exchanging
// it for a session is what actually sets the auth cookies via
// `createSupabaseServerClient`'s `setAll` (see that module's comment on
// why that write can silently no-op during a Server Component render —
// a Route Handler is one of the two places, alongside Server Actions,
// where it is guaranteed to actually persist, which is exactly why this
// exchange has to happen here and not in a page render).
//
// No `profiles` row insert here on purpose — Task 2's `handle_new_user`
// trigger on `auth.users` already does that on signup.
//
// A missing/invalid `code`, or Supabase rejecting the exchange, both fall
// through to the same redirect: there is nothing actionable for the user
// to do differently, and `getAuthState()` on `/closet` will just read back
// as signed-out.
//
// Default Node.js runtime — do not set `runtime = 'edge'`.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    if (supabase) {
      try {
        await supabase.auth.exchangeCodeForSession(code)
      } catch {
        // A rejected/expired code is a real possibility (the user waited
        // too long, double-clicked, or Google's redirect was replayed).
        // Fall through to the same redirect either way — `/closet` reads
        // back as signed-out via `getAuthState()`, which is the correct
        // outcome, not a crashed page.
      }
    }
  }

  return NextResponse.redirect(new URL('/closet', request.url))
}
