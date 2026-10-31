// POST /auth/sign-out — target of the plain `<form method="post">` in
// `AuthMenu`. A POST route handler (not a client-side
// `supabase.auth.signOut()` call) so the sign-out cookie write happens
// from a context Next.js actually allows writing cookies from — a Server
// Component render cannot (see `server.ts`'s `setAll` comment) and a
// plain form submit works even without client JS ever hydrating.
//
// Default Node.js runtime — do not set `runtime = 'edge'`.

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  if (supabase) {
    try {
      await supabase.auth.signOut()
    } catch {
      // Sign-out failing server-side still redirects home — there is no
      // better outcome to show the user, and we never want this to 500.
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
